import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ConfigSpeaker, ConfigProductGroup, ConfigStatus, ConfigProgram, ConfigCohort, FeedbackFormField } from '../types';
import { Plus, Trash2, Check, X, Pencil, Users, Layers, Tag, Key, Eye, EyeOff, RefreshCw, AlertCircle, ClipboardList, ChevronUp, ChevronDown, Shield, Calendar, Copy, Link, Zap, Mail, Sparkles, Lock, GripVertical } from 'lucide-react';

// ─── Colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#0ea5e9', '#6b7280',
  '#f97316', '#14b8a6', '#a855f7', '#e11d48',
];

const ColorSwatch: React.FC<{
  value: string;
  onChange: (c: string) => void;
}> = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', width: '160px' }}>
    {PALETTE.map(c => (
      <button
        key={c}
        onClick={() => onChange(c)}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: c,
          border: value === c ? '2.5px solid var(--text-primary)' : '2px solid transparent',
          cursor: 'pointer',
          outline: 'none',
          flexShrink: 0,
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title={c}
      />
    ))}
  </div>
);

// ─── Shared section card shell ─────────────────────────────────────────────────
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}> = ({
  icon, title, subtitle, actionButton, children
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--panel-bg)',
  }}>
    {/* Toolbar */}
    <div className="sheet-toolbar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel-bg)', padding: '1rem 2rem' }}>
      <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 34, height: 34,
          borderRadius: '8px',
          background: 'var(--background-alt)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', flexShrink: 0,
          border: '1px solid var(--border)',
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif" }}>{title}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
        </div>
      </div>
      {actionButton && (
        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {actionButton}
        </div>
      )}
    </div>
    <div className="table-responsive" style={{ flex: 1, padding: '0 2rem 1.5rem 2rem', overflowY: 'auto' }}>
      <div style={{ paddingTop: '1.5rem' }}>
        {children}
      </div>
    </div>
  </div>
);



// ─── Icon button ───────────────────────────────────────────────────────────────
const IconBtn: React.FC<{
  onClick: () => void;
  title?: string;
  danger?: boolean;
  success?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, danger, success, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '5px',
      borderRadius: '6px',
      color: danger ? 'var(--danger)' : success ? '#10b981' : 'var(--text-secondary)',
      display: 'flex', alignItems: 'center',
      transition: 'background-color 0.15s, color 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.backgroundColor = danger
        ? 'rgba(239,68,68,0.1)'
        : success
          ? 'rgba(16,185,129,0.1)'
          : 'var(--surface-elevated)';
    }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    {children}
  </button>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: 600,
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
    letterSpacing: '0.02em',
    textTransform: 'capitalize',
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
    {label}
  </span>
);



// ═══════════════════════════════════════════════════════════════════════════════
// SPEAKERS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const SpeakersSection: React.FC = () => {
  const { speakers, addSpeaker, updateSpeaker, deleteSpeaker, canUserEdit, currentUser } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editCanEdit, setEditCanEdit] = useState(true);
  const [editIsAdmin, setEditIsAdmin] = useState(true);

  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addCanEdit, setAddCanEdit] = useState(true);
  const [addIsAdmin, setAddIsAdmin] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  const startEdit = (s: ConfigSpeaker) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditEmail(s.email ?? '');
    setEditRole(s.role ?? '');
    setEditCanEdit(s.canEdit !== false);
    setEditIsAdmin(s.isAdmin !== false);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateSpeaker(editingId, { 
      name: editName.trim(), 
      email: editEmail.trim(), 
      role: editRole.trim(), 
      canEdit: editCanEdit,
      isAdmin: editIsAdmin
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!addName.trim()) return;
    addSpeaker({ 
      id: `spk-${Date.now()}`, 
      name: addName.trim(), 
      email: addEmail.trim(), 
      role: addRole.trim(),
      canEdit: addCanEdit,
      isAdmin: addIsAdmin
    });
    setAddName('');
    setAddEmail('');
    setAddRole('');
    setAddCanEdit(true);
    setAddIsAdmin(true);
    setShowAdd(false);
  };

  const actionButton = !showAdd && canUserEdit && isCurrentUserAdmin ? (
    <button
      onClick={() => setShowAdd(true)}
      className="btn btn-primary btn-sm"
    >
      <Plus size={14} /> Add Speaker
    </button>
  ) : null;

  return (
    <SectionCard
      icon={<Users size={16} />}
      title="POC Owners / Speakers"
      subtitle="Manage the speaker & owner list used across all dropdowns"
      actionButton={actionButton}
    >
      <table className="grid-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role / Title</th>
            <th style={{ width: 90, textAlign: 'center' }}>Can Edit</th>
            <th style={{ width: 90, textAlign: 'center' }}>Admin</th>
            <th style={{ width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {speakers.map(s => {
            const isSelf = currentUser && currentUser.id === s.id;

            return (
              <tr key={s.id}>
                <td>
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      className="config-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                  )}
                </td>
                <td>
                  {editingId === s.id ? (
                    <input
                      className="config-input"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Email(s) separated by comma…"
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{s.email || '—'}</span>
                  )}
                </td>
                <td>
                  {editingId === s.id ? (
                    <input
                      className="config-input"
                      value={editRole}
                      disabled={!isCurrentUserAdmin}
                      onChange={e => setEditRole(e.target.value)}
                      placeholder="e.g. Professor, Finance"
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.role || '—'}</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editingId === s.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed',
                          opacity: isCurrentUserAdmin ? 1 : 0.6
                        }}
                        onClick={() => isCurrentUserAdmin && setEditCanEdit(!editCanEdit)}
                      >
                        <div style={{
                          width: '28px',
                          height: '16px',
                          backgroundColor: editCanEdit ? 'var(--primary)' : 'var(--text-muted)',
                          borderRadius: '9px',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: editCanEdit ? '14px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                        <div style={{
                          width: '28px',
                          height: '16px',
                          backgroundColor: (s.canEdit !== false) ? 'var(--primary)' : 'var(--text-muted)',
                          borderRadius: '9px',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: (s.canEdit !== false) ? '14px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editingId === s.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed',
                          opacity: isCurrentUserAdmin ? 1 : 0.6
                        }}
                        onClick={() => isCurrentUserAdmin && setEditIsAdmin(!editIsAdmin)}
                      >
                        <div style={{
                          width: '28px',
                          height: '16px',
                          backgroundColor: editIsAdmin ? 'var(--primary)' : 'var(--text-muted)',
                          borderRadius: '9px',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: editIsAdmin ? '14px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                        <div style={{
                          width: '28px',
                          height: '16px',
                          backgroundColor: (s.isAdmin !== false) ? 'var(--primary)' : 'var(--text-muted)',
                          borderRadius: '9px',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: (s.isAdmin !== false) ? '14px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {editingId === s.id ? (
                      <>
                        <IconBtn onClick={saveEdit} success title="Save"><Check size={14} /></IconBtn>
                        <IconBtn onClick={() => { setEditingId(null); }} title="Cancel"><X size={14} /></IconBtn>
                      </>
                    ) : (
                      <>
                        {canUserEdit && (isCurrentUserAdmin || isSelf) && <IconBtn onClick={() => startEdit(s)} title="Edit"><Pencil size={14} /></IconBtn>}
                        {canUserEdit && isCurrentUserAdmin && <IconBtn onClick={() => deleteSpeaker(s.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Add row */}
          {showAdd && isCurrentUserAdmin && (
            <tr>
              <td>
                <input
                  autoFocus
                  className="config-input"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Speaker name…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                />
              </td>
              <td>
                <input
                  className="config-input"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="Email(s) separated by comma…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                />
              </td>
              <td>
                <input
                  className="config-input"
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  placeholder="Role / Title (optional)"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                />
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div 
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setAddCanEdit(!addCanEdit)}
                  >
                    <div style={{
                      width: '28px',
                      height: '16px',
                      backgroundColor: addCanEdit ? 'var(--primary)' : 'var(--text-muted)',
                      borderRadius: '9px',
                      position: 'relative',
                      transition: 'background-color 0.2s'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: addCanEdit ? '14px' : '2px',
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div 
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setAddIsAdmin(!addIsAdmin)}
                  >
                    <div style={{
                      width: '28px',
                      height: '16px',
                      backgroundColor: addIsAdmin ? 'var(--primary)' : 'var(--text-muted)',
                      borderRadius: '9px',
                      position: 'relative',
                      transition: 'background-color 0.2s'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: addIsAdmin ? '14px' : '2px',
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT GROUPS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ProductGroupsSection: React.FC = () => {
  const { productGroups, addProductGroup, updateProductGroup, deleteProductGroup, canUserEdit } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [addName, setAddName] = useState('');
  const [addColor, setAddColor] = useState('#6366f1');
  const [showAdd, setShowAdd] = useState(false);
  const [showSwatchFor, setShowSwatchFor] = useState<string | null>(null); // 'edit' | 'add'

  const startEdit = (g: ConfigProductGroup) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditColor(g.color);
    setShowSwatchFor(null);
  };
  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateProductGroup(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
    setShowSwatchFor(null);
  };
  const handleAdd = () => {
    if (!addName.trim()) return;
    addProductGroup({ 
      id: `pg-${Date.now()}`, 
      name: addName.trim(), 
      color: addColor
    });
    setAddName('');
    setAddColor('#6366f1');
    setShowAdd(false);
    setShowSwatchFor(null);
  };

  const actionButton = !showAdd && canUserEdit ? (
    <button
      onClick={() => setShowAdd(true)}
      className="btn btn-primary btn-sm"
    >
      <Plus size={14} /> Add Product Group
    </button>
  ) : null;

  return (
    <SectionCard
      icon={<Layers size={16} />}
      title="Product Groups"
      subtitle="Define product areas used across the Priority Requests tracker"
      actionButton={actionButton}
    >
      <table className="grid-table">
        <thead>
          <tr>
            <th>Product Group</th>
            <th style={{ width: 90 }}>Colour</th>
            <th style={{ width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {productGroups.map(g => (
            <tr key={g.id}>
              <td>
                {editingId === g.id ? (
                  <input
                    autoFocus
                    className="config-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Product group name..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <div>
                    <Badge color={g.color} label={g.name} />
                  </div>
                )}
              </td>
              <td>
                {editingId === g.id ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowSwatchFor(showSwatchFor === g.id ? null : g.id)}
                      style={{
                        width: 24, height: 24, borderRadius: '6px',
                        background: editColor,
                        border: '2px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      title="Pick colour"
                    />
                    {showSwatchFor === g.id && (
                      <div style={{
                        position: 'absolute', top: 30, left: 0, zIndex: 999,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '8px',
                        boxShadow: 'var(--shadow)',
                      }}>
                        <ColorSwatch value={editColor} onChange={c => { setEditColor(c); setShowSwatchFor(null); }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{g.color}</span>
                  </span>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  {editingId === g.id ? (
                    <>
                      <IconBtn onClick={saveEdit} success title="Save"><Check size={14} /></IconBtn>
                      <IconBtn onClick={() => { setEditingId(null); setShowSwatchFor(null); }} title="Cancel"><X size={14} /></IconBtn>
                    </>
                  ) : (
                    <>
                      {canUserEdit && <IconBtn onClick={() => startEdit(g)} title="Edit"><Pencil size={14} /></IconBtn>}
                      {canUserEdit && <IconBtn onClick={() => deleteProductGroup(g.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {showAdd && (
            <tr>
              <td>
                <input
                  autoFocus
                  className="config-input"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Group name…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                />
              </td>
              <td>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSwatchFor(showSwatchFor === 'add' ? null : 'add')}
                    style={{
                      width: 24, height: 24, borderRadius: '6px',
                      background: addColor,
                      border: '2px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    title="Pick colour"
                  />
                  {showSwatchFor === 'add' && (
                    <div style={{
                      position: 'absolute', top: 30, left: 0, zIndex: 999,
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '8px',
                      boxShadow: 'var(--shadow)',
                    }}>
                      <ColorSwatch value={addColor} onChange={c => { setAddColor(c); setShowSwatchFor(null); }} />
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSES SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const StatusesSection: React.FC = () => {
  const { statuses, addStatus, updateStatus, deleteStatus, canUserEdit } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [addLabel, setAddLabel] = useState('');
  const [addColor, setAddColor] = useState('#6366f1');
  const [showAdd, setShowAdd] = useState(false);
  const [showSwatchFor, setShowSwatchFor] = useState<string | null>(null);

  const startEdit = (s: ConfigStatus) => {
    setEditingId(s.id);
    setEditLabel(s.label);
    setEditColor(s.color);
    setShowSwatchFor(null);
  };
  const saveEdit = () => {
    if (!editLabel.trim() || !editingId) return;
    updateStatus(editingId, { label: editLabel.trim(), color: editColor, scope: 'all' });
    setEditingId(null);
  };
  const handleAdd = () => {
    if (!addLabel.trim()) return;
    addStatus({ id: `st-${Date.now()}`, label: addLabel.trim(), color: addColor, scope: 'all' });
    setAddLabel('');
    setAddColor('#6366f1');
    setShowAdd(false);
    setShowSwatchFor(null);
  };

  const actionButton = !showAdd && canUserEdit ? (
    <button
      onClick={() => setShowAdd(true)}
      className="btn btn-primary btn-sm"
    >
      <Plus size={14} /> Add Status
    </button>
  ) : null;

  return (
    <SectionCard
      icon={<Tag size={16} />}
      title="Statuses"
      subtitle="Manage status labels and where they appear across the dashboard"
      actionButton={actionButton}
    >
      <table className="grid-table">
        <thead>
          <tr>
            <th>Label</th>
            <th style={{ width: 90 }}>Colour</th>
            <th style={{ width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map(s => (
            <tr key={s.id}>
              <td>
                {editingId === s.id ? (
                  <input
                    autoFocus
                    className="config-input"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <Badge color={s.color} label={s.label} />
                )}
              </td>
              <td>
                {editingId === s.id ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowSwatchFor(showSwatchFor === s.id ? null : s.id)}
                      style={{ width: 24, height: 24, borderRadius: '6px', background: editColor, border: '2px solid var(--border)', cursor: 'pointer' }}
                      title="Pick colour"
                    />
                    {showSwatchFor === s.id && (
                      <div style={{
                        position: 'absolute', top: 30, left: 0, zIndex: 999,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '8px',
                        boxShadow: 'var(--shadow)',
                      }}>
                        <ColorSwatch value={editColor} onChange={c => { setEditColor(c); setShowSwatchFor(null); }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.color}</span>
                  </span>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  {editingId === s.id ? (
                    <>
                      <IconBtn onClick={saveEdit} success title="Save"><Check size={14} /></IconBtn>
                      <IconBtn onClick={() => setEditingId(null)} title="Cancel"><X size={14} /></IconBtn>
                    </>
                  ) : (
                    <>
                      {canUserEdit && <IconBtn onClick={() => startEdit(s)} title="Edit"><Pencil size={14} /></IconBtn>}
                      {canUserEdit && <IconBtn onClick={() => deleteStatus(s.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {showAdd && (
            <tr>
              <td>
                <input
                  autoFocus
                  className="config-input"
                  value={addLabel}
                  onChange={e => setAddLabel(e.target.value)}
                  placeholder="Status label…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                />
              </td>
              <td>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSwatchFor(showSwatchFor === 'add' ? null : 'add')}
                    style={{ width: 24, height: 24, borderRadius: '6px', background: addColor, border: '2px solid var(--border)', cursor: 'pointer' }}
                    title="Pick colour"
                  />
                  {showSwatchFor === 'add' && (
                    <div style={{
                      position: 'absolute', top: 30, left: 0, zIndex: 999,
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '8px',
                      boxShadow: 'var(--shadow)',
                    }}>
                      <ColorSwatch value={addColor} onChange={c => { setAddColor(c); setShowSwatchFor(null); }} />
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SectionCard>
  );
};

const ProgramsSection: React.FC = () => {
  const { 
    programs, addProgram, updateProgram, deleteProgram,
    cohorts, addCohort, updateCohort, deleteCohort, canUserEdit, confirm 
  } = useDashboard();

  // Program edit states
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgramName, setEditProgramName] = useState('');
  const [newProgramName, setNewProgramName] = useState('');
  const [showAddProgram, setShowAddProgram] = useState(false);

  // Cohort edit states
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [editCohortName, setEditCohortName] = useState('');
  
  // Adding cohort state
  const [addingCohortForProgramId, setAddingCohortForProgramId] = useState<string | null>(null);
  const [newCohortName, setNewCohortName] = useState('');

  // Local states for smooth drag and drop preview
  const [localPrograms, setLocalPrograms] = useState<ConfigProgram[]>([]);
  const [localCohorts, setLocalCohorts] = useState<ConfigCohort[]>([]);

  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [programSearch, setProgramSearch] = useState('');
  const [cohortSearch, setCohortSearch] = useState('');

  // Dragging states
  const [draggedProgramId, setDraggedProgramId] = useState<string | null>(null);
  const [dragOverProgramId, setDragOverProgramId] = useState<string | null>(null);
  const [draggedCohortId, setDraggedCohortId] = useState<string | null>(null);
  const [dragOverCohortId, setDragOverCohortId] = useState<string | null>(null);

  // Sync with context
  useEffect(() => {
    if (!draggedProgramId) {
      const sortedProgs = [...programs].sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocalPrograms(sortedProgs);
      if (sortedProgs.length > 0 && !activeProgramId) {
        setActiveProgramId(sortedProgs[0].id);
      }
    }
  }, [programs, draggedProgramId]);

  useEffect(() => {
    if (activeProgramId && localPrograms.length > 0 && !localPrograms.some(p => p.id === activeProgramId)) {
      setActiveProgramId(localPrograms[0].id);
    }
  }, [localPrograms, activeProgramId]);

  useEffect(() => {
    if (!draggedCohortId) {
      setLocalCohorts([...cohorts].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  }, [cohorts, draggedCohortId]);

  // Program Drag Handlers
  const handleProgramDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProgramId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProgramDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverProgramId !== targetId) {
      setDragOverProgramId(targetId);
    }
    if (!draggedProgramId || draggedProgramId === targetId) return;

    const dragIndex = localPrograms.findIndex(p => p.id === draggedProgramId);
    const targetIndex = localPrograms.findIndex(p => p.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localPrograms];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    
    setLocalPrograms(newList);
  };

  const handleProgramDragEnd = () => {
    if (draggedProgramId) {
      localPrograms.forEach((p, index) => {
        if (p.order !== index) {
          updateProgram(p.id, { order: index });
        }
      });
      setDraggedProgramId(null);
    }
    setDragOverProgramId(null);
  };

  // Cohort Drag Handlers
  const handleCohortDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation(); // prevent row drag
    setDraggedCohortId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCohortDragOver = (e: React.DragEvent, targetId: string, targetProgramId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverCohortId !== targetId) {
      setDragOverCohortId(targetId);
    }
    if (!draggedCohortId || draggedCohortId === targetId) return;

    const dragIndex = localCohorts.findIndex(c => c.id === draggedCohortId);
    const targetIndex = localCohorts.findIndex(c => c.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localCohorts];
    newList[dragIndex] = { ...newList[dragIndex], programId: targetProgramId };

    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    
    setLocalCohorts(newList);
  };

  const handleCohortDragEnd = () => {
    if (draggedCohortId) {
      localCohorts.forEach((c, index) => {
        const original = cohorts.find(x => x.id === c.id);
        if (original && (original.order !== index || original.programId !== c.programId)) {
          updateCohort(c.id, { order: index, programId: c.programId });
        }
      });
      setDraggedCohortId(null);
    }
    setDragOverCohortId(null);
  };

  const handleCohortCellDragOver = (e: React.DragEvent, programId: string) => {
    e.preventDefault();
    if (!draggedCohortId) return;
    
    const dragIndex = localCohorts.findIndex(c => c.id === draggedCohortId);
    if (dragIndex === -1) return;
    
    const draggedCohort = localCohorts[dragIndex];
    if (draggedCohort.programId === programId) return;

    const newList = [...localCohorts];
    newList[dragIndex] = { ...draggedCohort, programId };
    setLocalCohorts(newList);
  };

  const startProgramEdit = (p: ConfigProgram) => {
    setEditingProgramId(p.id);
    setEditProgramName(p.name);
  };

  const saveProgramEdit = () => {
    if (!editProgramName.trim() || !editingProgramId) return;
    updateProgram(editingProgramId, { name: editProgramName.trim() });
    setEditingProgramId(null);
  };

  const handleAddProgram = () => {
    if (!newProgramName.trim()) return;
    addProgram({ id: `prog-${Date.now()}`, name: newProgramName.trim(), order: programs.length });
    setNewProgramName('');
    setShowAddProgram(false);
  };

  const startCohortEdit = (c: ConfigCohort) => {
    setEditingCohortId(c.id);
    setEditCohortName(c.name);
  };

  const saveCohortEdit = () => {
    if (!editCohortName.trim() || !editingCohortId) return;
    updateCohort(editingCohortId, { name: editCohortName.trim() });
    setEditingCohortId(null);
  };

  const handleAddCohort = (programId: string) => {
    if (!newCohortName.trim()) return;
    const programCohorts = cohorts.filter(c => c.programId === programId);
    addCohort({ id: `coh-${Date.now()}`, name: newCohortName.trim(), programId, order: programCohorts.length });
    setNewCohortName('');
    setAddingCohortForProgramId(null);
  };

  const filteredPrograms = localPrograms.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase())
  );

  const activeProgram = localPrograms.find(p => p.id === activeProgramId);
  const activeProgramCohorts = activeProgram 
    ? localCohorts.filter(c => c.programId === activeProgram.id && c.name.toLowerCase().includes(cohortSearch.toLowerCase()))
    : [];

  return (
    <SectionCard
      icon={<Layers size={16} />}
      title="Programs & Cohorts"
      subtitle="Manage academic programs and their associated student cohorts/sections in a unified split workspace"
    >
      <div style={{ display: 'flex', gap: '1.5rem', minHeight: '450px' }}>
        
        {/* LEFT COLUMN: Programs Sidebar */}
        <div style={{
          width: '280px',
          flexShrink: 0,
          borderRight: '1.5px solid var(--border)',
          paddingRight: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Programs ({localPrograms.length})
            </span>
            {canUserEdit && !showAddProgram && (
              <button
                onClick={() => { setShowAddProgram(true); setNewProgramName(''); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: 600, padding: 0
                }}
              >
                <Plus size={12} /> Add Program
              </button>
            )}
          </div>

          {/* Program Search input */}
          <input
            type="text"
            placeholder="Search programs..."
            className="config-input"
            style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', marginBottom: '0.25rem' }}
            value={programSearch}
            onChange={e => setProgramSearch(e.target.value)}
          />

          {/* Add Program Inline Form */}
          {showAddProgram && (
            <div style={{ display: 'flex', gap: '4px', background: 'var(--background)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <input
                autoFocus
                placeholder="Program name..."
                className="config-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
                value={newProgramName}
                onChange={e => setNewProgramName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddProgram();
                  if (e.key === 'Escape') setShowAddProgram(false);
                }}
              />
              <IconBtn onClick={handleAddProgram} success title="Add"><Check size={12} /></IconBtn>
              <IconBtn onClick={() => setShowAddProgram(false)} title="Cancel"><X size={12} /></IconBtn>
            </div>
          )}

          {/* Programs Scrollable List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '2px'
          }}>
            {filteredPrograms.map(p => {
              const count = localCohorts.filter(c => c.programId === p.id).length;
              const isSelected = p.id === activeProgramId;
              return (
                <div
                  key={p.id}
                  draggable={canUserEdit && !editingProgramId && !editingCohortId}
                  onDragStart={(e) => handleProgramDragStart(e, p.id)}
                  onDragOver={(e) => {
                    if (draggedCohortId) {
                      handleCohortCellDragOver(e, p.id);
                    } else {
                      handleProgramDragOver(e, p.id);
                    }
                  }}
                  onDragEnd={handleProgramDragEnd}
                  onClick={() => setActiveProgramId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary-glow)' : 'transparent',
                    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    opacity: p.id === draggedProgramId ? 0.4 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--background)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    {canUserEdit && <GripVertical size={13} style={{ cursor: 'grab', opacity: 0.4, flexShrink: 0 }} />}
                    {editingProgramId === p.id ? (
                      <input
                        autoFocus
                        className="config-input"
                        style={{ padding: '2px 6px', fontSize: '0.8rem', width: '100%' }}
                        value={editProgramName}
                        onChange={e => setEditProgramName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveProgramEdit();
                          if (e.key === 'Escape') setEditingProgramId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span style={{
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {p.name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: isSelected ? 'var(--primary)' : 'var(--border)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {count}
                    </span>

                    {/* Program quick edit/delete buttons */}
                    {!editingProgramId && isSelected && canUserEdit && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <IconBtn onClick={() => startProgramEdit(p)} title="Rename"><Pencil size={11} /></IconBtn>
                        <IconBtn
                          onClick={async () => {
                            if (await confirm(`Delete program "${p.name}"? All its cohorts will also be removed.`, 'Delete Program')) {
                              const programCohorts = localCohorts.filter(c => c.programId === p.id);
                              programCohorts.forEach(c => deleteCohort(c.id));
                              deleteProgram(p.id);
                            }
                          }}
                          danger title="Delete"
                        >
                          <Trash2 size={11} />
                        </IconBtn>
                      </div>
                    )}

                    {editingProgramId === p.id && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <IconBtn onClick={saveProgramEdit} success title="Save"><Check size={11} /></IconBtn>
                        <IconBtn onClick={() => setEditingProgramId(null)} title="Cancel"><X size={11} /></IconBtn>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Cohorts Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          {activeProgram ? (
            <>
              {/* Active Program Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {activeProgram.name} Cohorts
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Drag cohorts to sort, or hover a program in the sidebar to move them.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Cohort Search */}
                  <input
                    type="text"
                    placeholder="Search cohorts..."
                    className="config-input"
                    style={{ padding: '5px 10px', fontSize: '0.75rem', width: '150px' }}
                    value={cohortSearch}
                    onChange={e => setCohortSearch(e.target.value)}
                  />

                  {canUserEdit && (
                    <button
                      onClick={() => { setAddingCohortForProgramId(activeProgram.id); setNewCohortName(''); }}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> Add Cohort
                    </button>
                  )}
                </div>
              </div>

              {/* Add Cohort Inline Input */}
              {addingCohortForProgramId === activeProgram.id && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--background)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <input
                    autoFocus
                    placeholder="Enter cohort name..."
                    className="config-input"
                    style={{ padding: '5px 10px', fontSize: '0.8rem', flex: 1 }}
                    value={newCohortName}
                    onChange={e => setNewCohortName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddCohort(activeProgram.id);
                      if (e.key === 'Escape') setAddingCohortForProgramId(null);
                    }}
                  />
                  <IconBtn onClick={() => handleAddCohort(activeProgram.id)} success title="Add"><Check size={12} /></IconBtn>
                  <IconBtn onClick={() => setAddingCohortForProgramId(null)} title="Cancel"><X size={12} /></IconBtn>
                </div>
              )}

              {/* Cohorts Grid List */}
              {activeProgramCohorts.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed var(--border)', borderRadius: '12px', padding: '2rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No cohorts found. Click "Add Cohort" to create one.
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  alignContent: 'start',
                  padding: '2px'
                }}>
                  {activeProgramCohorts.map(c => (
                    <div
                      key={c.id}
                      draggable={canUserEdit && !editingCohortId && !editingProgramId}
                      onDragStart={(e) => handleCohortDragStart(e, c.id)}
                      onDragOver={(e) => handleCohortDragOver(e, c.id, activeProgram.id)}
                      onDragEnd={handleCohortDragEnd}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--background)',
                        border: c.id === dragOverCohortId 
                          ? '1.5px solid var(--primary)' 
                          : `1px solid ${c.active !== false ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        transition: 'all 0.15s',
                        opacity: c.id === draggedCohortId ? 0.4 : (c.active !== false ? 1 : 0.7),
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Active Toggle */}
                      <label
                        title={c.active !== false ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                        style={{ display: 'flex', alignItems: 'center', cursor: canUserEdit ? 'pointer' : 'default', userSelect: 'none', flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={c.active !== false}
                          onChange={() => canUserEdit && updateCohort(c.id, { active: c.active === false })}
                          disabled={!canUserEdit}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          width: 32, height: 16, borderRadius: 8,
                          background: c.active !== false ? 'var(--primary)' : 'var(--text-muted)',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: c.active !== false ? 18 : 2,
                            width: 12, height: 12,
                            borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.2s',
                          }} />
                        </span>
                      </label>

                      {canUserEdit && <GripVertical size={11} style={{ opacity: 0.4, cursor: 'grab', flexShrink: 0 }} />}

                      {/* Cohort Name */}
                      <div style={{ flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
                        {editingCohortId === c.id ? (
                          <input
                            autoFocus
                            className="config-input"
                            style={{ padding: '2px 6px', fontSize: '0.8rem', width: '100%' }}
                            value={editCohortName}
                            onChange={e => setEditCohortName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveCohortEdit();
                              if (e.key === 'Escape') setEditingCohortId(null);
                            }}
                          />
                        ) : (
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: c.active !== false ? 'var(--text-primary)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {c.name}
                          </span>
                        )}
                      </div>

                      {/* Cohort actions */}
                      <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {editingCohortId === c.id ? (
                          <>
                            <IconBtn onClick={saveCohortEdit} success title="Save"><Check size={11} /></IconBtn>
                            <IconBtn onClick={() => setEditingCohortId(null)} title="Cancel"><X size={11} /></IconBtn>
                          </>
                        ) : (
                          <>
                            {canUserEdit && <IconBtn onClick={() => startCohortEdit(c)} title="Rename"><Pencil size={11} /></IconBtn>}
                            {canUserEdit && <IconBtn onClick={() => deleteCohort(c.id)} danger title="Delete"><Trash2 size={11} /></IconBtn>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed var(--border)', borderRadius: '12px', padding: '2rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Select a program from the sidebar to view and manage its cohorts.
              </span>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLICKUP INTEGRATION SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ClickupSettingsSection: React.FC = () => {
  const { clickupApiKey, setClickupApiKey, syncClickupTask, registerClickupWebhook, checkClickupWebhookStatus, canUserEdit } = useDashboard();
  const [apiKeyInput, setApiKeyInput] = useState(clickupApiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Webhook states
  const [webhookStatus, setWebhookStatus] = useState<'loading' | 'registered' | 'unregistered'>('loading');
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRegisterWebhook = async () => {
    if (!canUserEdit || isRegisteringWebhook) return;
    setIsRegisteringWebhook(true);
    setWebhookResult(null);
    try {
      setClickupApiKey(apiKeyInput.trim());

      const res = await registerClickupWebhook();
      if (res.success) {
        setWebhookStatus('registered');
        setWebhookResult({
          success: true,
          message: 'Webhook registered successfully! ClickUp status changes will now sync instantly.'
        });
      } else {
        setWebhookResult({
          success: false,
          message: res.error || 'Failed to register webhook. Note: webhooks require a public URL (e.g. deployed site or ngrok proxy).'
        });
      }
    } catch (err: any) {
      setWebhookResult({
        success: false,
        message: err.message || 'An error occurred during webhook setup.'
      });
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  React.useEffect(() => {
    const fetchWebhookStatus = async () => {
      if (!clickupApiKey.trim()) {
        setWebhookStatus('unregistered');
        return;
      }
      setWebhookStatus('loading');
      try {
        const res = await checkClickupWebhookStatus();
        if (res.success && res.registered) {
          setWebhookStatus('registered');
        } else {
          setWebhookStatus('unregistered');
        }
      } catch (e) {
        setWebhookStatus('unregistered');
      }
    };
    fetchWebhookStatus();
  }, [clickupApiKey]);

  // Sync local input with database value when loaded
  React.useEffect(() => {
    setApiKeyInput(clickupApiKey);
  }, [clickupApiKey]);

  // Test states
  const [testLink, setTestLink] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    status?: string;
  } | null>(null);

  const handleSave = () => {
    if (!canUserEdit) return;
    setClickupApiKey(apiKeyInput.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!testLink.trim() || !canUserEdit) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      // Temporarily save first to context so it can be tested
      setClickupApiKey(apiKeyInput.trim());
      
      const res = await syncClickupTask(testLink.trim());
      if (res) {
        setTestResult({
          success: true,
          message: `Successfully connected! Task status is:`,
          status: res.status
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to fetch status. Check your API key or task ID (note that CORS restrictions may block browser requests).'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'An error occurred during verification.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SectionCard
      icon={<Key size={16} />}
      title="ClickUp Settings"
      subtitle="Configure your ClickUp API credentials to pull task status automatically"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        {/* Credentials Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Personal API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', position: 'relative', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="pk_..."
              disabled={!canUserEdit}
              className="config-input"
              style={{
                paddingRight: '40px',
                opacity: canUserEdit ? 1 : 0.6,
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              disabled={!canUserEdit}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: canUserEdit ? 'pointer' : 'default',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title={showKey ? "Hide API Key" : "Show API Key"}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Get your token from ClickUp: <strong>Settings &gt; Apps &gt; API Token</strong> (generate a personal token).
          </p>
        </div>

        <div>
          <button
            onClick={handleSave}
            disabled={!canUserEdit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: isSaved ? '#10b981' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: canUserEdit ? 'pointer' : 'default',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'background-color 0.15s, opacity 0.15s',
              opacity: canUserEdit ? 1 : 0.5,
            }}
            onMouseEnter={e => { if (!isSaved && canUserEdit) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { if (!isSaved && canUserEdit) e.currentTarget.style.opacity = '1'; }}
          >
            {isSaved ? <Check size={14} /> : null}
            {isSaved ? 'Saved Settings!' : 'Save Credentials'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Test Connection
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
            Enter a ClickUp Task URL or ID to verify the key.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={testLink}
              onChange={e => setTestLink(e.target.value)}
              placeholder="e.g., https://app.clickup.com/t/86ay8h4v9 or 86ay8h4v9"
              disabled={!canUserEdit}
              className="config-input"
              style={{
                opacity: canUserEdit ? 1 : 0.6,
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleTest(); }}
            />
            <button
              onClick={handleTest}
              disabled={!canUserEdit || isTesting || !testLink.trim() || !apiKeyInput.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--background-alt)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                cursor: (canUserEdit && !isTesting && testLink.trim() && apiKeyInput.trim()) ? 'pointer' : 'default',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.15s',
                opacity: (!canUserEdit || isTesting || !testLink.trim() || !apiKeyInput.trim()) ? 0.5 : 1,
              }}
            >
              {isTesting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              {testResult.success ? (
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              )}
              <div style={{ color: testResult.success ? 'var(--text-primary)' : 'var(--danger)' }}>
                {testResult.message}
                {testResult.status && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59,130,246,0.3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {testResult.status}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Webhooks */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Real-Time Sync (Webhooks)
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
            Register webhooks to receive real-time updates directly from ClickUp.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleRegisterWebhook}
              disabled={!canUserEdit || isRegisteringWebhook || webhookStatus === 'loading' || !apiKeyInput.trim() || webhookStatus === 'registered'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: webhookStatus === 'registered' ? '#10b981' : 'var(--background-alt)',
                color: webhookStatus === 'registered' ? '#fff' : 'var(--text-primary)',
                border: webhookStatus === 'registered' ? '1.5px solid #10b981' : '1.5px solid var(--border)',
                borderRadius: '8px',
                cursor: (canUserEdit && !isRegisteringWebhook && webhookStatus !== 'loading' && apiKeyInput.trim() && webhookStatus !== 'registered') ? 'pointer' : 'default',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.15s',
                opacity: (!canUserEdit || isRegisteringWebhook || webhookStatus === 'loading' || !apiKeyInput.trim() || webhookStatus === 'registered') ? 0.8 : 1,
              }}
            >
              {isRegisteringWebhook || webhookStatus === 'loading' ? (
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : webhookStatus === 'registered' ? (
                <Check size={14} />
              ) : (
                <Zap size={14} />
              )}
              {isRegisteringWebhook ? 'Registering...' : webhookStatus === 'loading' ? 'Checking Status...' : webhookStatus === 'registered' ? 'Connected Successfully!' : 'Setup Webhook'}
            </button>

            {webhookStatus === 'registered' && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Check size={14} /> Active
              </span>
            )}
          </div>

          {webhookResult && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${webhookResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                background: webhookResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              {webhookResult.success ? (
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              )}
              <div style={{ color: webhookResult.success ? 'var(--text-primary)' : 'var(--danger)' }}>
                {webhookResult.message}
              </div>
            </div>
          )}
        </div>

      </div>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM BUILDER SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const OptionsInput: React.FC<{
  options: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}> = ({ options, onChange, disabled }) => {
  const [inputValue, setInputValue] = React.useState((options || []).join(', '));

  React.useEffect(() => {
    const currentParsed = inputValue.split(',').map(s => s.trim()).filter(Boolean);
    if (JSON.stringify(currentParsed) !== JSON.stringify(options || [])) {
      setInputValue((options || []).join(', '));
    }
  }, [options]);

  return (
    <input
      type="text"
      placeholder="e.g. Good, Neutral, Poor (comma separated)"
      value={inputValue}
      disabled={disabled}
      onChange={e => {
        const val = e.target.value;
        setInputValue(val);
        const parsed = val.split(',').map(s => s.trim()).filter(Boolean);
        onChange(parsed);
      }}
      style={{
        flex: 1,
        padding: '4px 8px',
        background: 'var(--panel-bg)',
        border: '1.5px solid var(--border-light)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '0.75rem',
        outline: 'none'
      }}
    />
  );
};

const FormBuilderSection: React.FC = () => {
  const { formConfigs, saveFormConfig, canUserEdit, alert } = useDashboard();
  const [selectedCategory, setSelectedCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects'>('admin-calls');
  const [enabled, setEnabled] = useState(true);
  const [fields, setFields] = useState<FeedbackFormField[]>([]);

  React.useEffect(() => {
    const config = formConfigs.find(c => c.category === selectedCategory);
    if (config) {
      setEnabled(config.enabled);
      setFields(config.fields || []);
    } else {
      setEnabled(false);
      setFields([]);
    }
  }, [selectedCategory, formConfigs]);

  const handleAddField = () => {
    const newField: FeedbackFormField = {
      id: `field-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: '',
      type: 'rating',
      required: true,
      options: [],
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx })));
  };

  const handleUpdateField = (fieldId: string, updated: Partial<FeedbackFormField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updated } : f));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index - 1];
    newFields[index - 1] = temp;
    setFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + 1];
    newFields[index + 1] = temp;
    setFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const handleSave = async () => {
    if (fields.some(f => !f.label.trim())) {
      await alert('All questions must have a label.', 'Validation Error', 'OK', 'danger');
      return;
    }

    const configId = `form-${selectedCategory}`;
    try {
      await saveFormConfig({
        id: configId,
        category: selectedCategory,
        enabled,
        fields
      });
      await alert('Form configuration saved successfully!', 'Saved', 'OK', 'success');
    } catch (err: any) {
      await alert(`Failed to save: ${err.message}`, 'Save Failed', 'OK', 'danger');
    }
  };

  return (
    <SectionCard
      icon={<ClipboardList size={16} />}
      title="Feedback Form Builder"
      subtitle="Configure dynamic feedback questionnaires for each meeting/project type"
      actionButton={
        canUserEdit && (
          <button
            onClick={handleSave}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Check size={14} /> Save Configuration
          </button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        
        {/* Category selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Choose Target Category
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['admin-calls', 'ama-meetings', 'student-projects'] as const).map(cat => {
              const labelMap = {
                'admin-calls': 'Admin Calls',
                'ama-meetings': 'AMA & Meetings',
                'student-projects': 'Student Projects'
              };
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-light)',
                    background: isSelected ? 'var(--primary-glow)' : 'var(--background)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </div>
        </div>

        <div 
          onClick={() => canUserEdit && setEnabled(!enabled)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--background-alt)', padding: '1rem', borderRadius: '12px',
            border: '1px solid var(--border)',
            cursor: canUserEdit ? 'pointer' : 'default',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '28px',
            height: '16px',
            backgroundColor: enabled ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: '9px',
            position: 'relative',
            transition: 'background-color 0.2s',
            flexShrink: 0
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#fff',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: enabled ? '14px' : '2px',
              transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Enable feedback form links for this category
          </span>
        </div>

        {/* Questions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Form Questions ({fields.length})
            </h4>
            {canUserEdit && (
              <button
                onClick={handleAddField}
                style={{
                  background: 'var(--background-alt)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> Add Question
              </button>
            )}
          </div>

          {fields.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2.5rem', borderRadius: '12px',
              border: '1.5px dashed var(--border-light)', color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              No questions configured. Click "Add Question" to start building this feedback form.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    position: 'relative'
                  }}
                >
                  {/* Top Row: Input and Controls */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', width: '20px' }}>
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Enter question text..."
                      value={field.label}
                      disabled={!canUserEdit}
                      onChange={e => handleUpdateField(field.id, { label: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'var(--panel-bg)',
                        border: '1.5px solid var(--border-light)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    
                    <div 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: canUserEdit ? 'pointer' : 'default',
                        userSelect: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: field.required ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                      onClick={() => canUserEdit && handleUpdateField(field.id, { required: !field.required })}
                    >
                      <div style={{
                        width: '28px',
                        height: '16px',
                        backgroundColor: field.required ? 'var(--primary)' : 'var(--text-muted)',
                        borderRadius: '9px',
                        position: 'relative',
                        transition: 'background-color 0.2s'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#fff',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '2px',
                          left: field.required ? '14px' : '2px',
                          transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                      <span>Required</span>
                    </div>

                    {/* Sorting & Delete buttons */}
                    {canUserEdit && (
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          style={{
                            background: 'none', border: 'none', color: index === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                            cursor: index === 0 ? 'default' : 'pointer', padding: '4px', borderRadius: '4px', opacity: index === 0 ? 0.3 : 1
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          disabled={index === fields.length - 1}
                          onClick={() => handleMoveDown(index)}
                          style={{
                            background: 'none', border: 'none', color: index === fields.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                            cursor: index === fields.length - 1 ? 'default' : 'pointer', padding: '4px', borderRadius: '4px', opacity: index === fields.length - 1 ? 0.3 : 1
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--danger)',
                            cursor: 'pointer', padding: '4px', borderRadius: '4px', marginLeft: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Middle Row: Question Type & Extra options */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingLeft: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type:</span>
                      <select
                        value={field.type}
                        disabled={!canUserEdit}
                        onChange={e => handleUpdateField(field.id, { type: e.target.value as any, options: [] })}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--panel-bg)',
                          border: '1.5px solid var(--border-light)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          cursor: canUserEdit ? 'pointer' : 'default',
                          outline: 'none'
                        }}
                      >
                        <option value="rating">Rating (1-5 Stars)</option>
                        <option value="text">Short Answer</option>
                        <option value="textarea">Paragraph Comment</option>
                        <option value="select">Dropdown Select</option>
                        <option value="checkbox">Multiple Checkboxes</option>
                      </select>
                    </div>

                    {/* Options list for select/checkbox */}
                    {(field.type === 'select' || field.type === 'checkbox') && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Choices:</span>
                        <OptionsInput
                          options={field.options || []}
                          disabled={!canUserEdit}
                          onChange={opts => handleUpdateField(field.id, { options: opts })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM SECURITY SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const FormSecuritySection: React.FC = () => {
  const {
    googleClientId, setGoogleClientId,
    requireGoogleLogin, setRequireGoogleLogin,
    googleAllowedDomains, setGoogleAllowedDomains,
    canUserEdit
  } = useDashboard();

  const [clientIdInput, setClientIdInput] = useState(googleClientId);
  const [allowedDomainsInput, setAllowedDomainsInput] = useState(googleAllowedDomains);
  const [requireLoginVal, setRequireLoginVal] = useState(requireGoogleLogin);
  const [isSaved, setIsSaved] = useState(false);

  // Sync inputs with DB values when loaded
  React.useEffect(() => {
    setClientIdInput(googleClientId);
    setRequireLoginVal(requireGoogleLogin);
    setAllowedDomainsInput(googleAllowedDomains);
  }, [googleClientId, requireGoogleLogin, googleAllowedDomains]);

  const handleSave = () => {
    if (!canUserEdit) return;
    setGoogleClientId(clientIdInput.trim());
    setRequireGoogleLogin(requireLoginVal);
    setGoogleAllowedDomains(allowedDomainsInput.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Settings Card */}
        <SectionCard
          icon={<Shield size={16} />}
          title="Form Security Settings"
          subtitle="Configure Google Sign-In requirements and response policies"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Require Google Login Checkbox */}
            <div 
              onClick={() => canUserEdit && setRequireLoginVal(!requireLoginVal)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--background-alt)', padding: '12px 16px', borderRadius: '12px',
                border: '1px solid var(--border-light)',
                cursor: canUserEdit ? 'pointer' : 'default',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '28px',
                height: '16px',
                backgroundColor: requireLoginVal ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '9px',
                position: 'relative',
                transition: 'background-color 0.2s',
                flexShrink: 0
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: requireLoginVal ? '14px' : '2px',
                  transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Require Google Login for Feedback Forms
              </span>
            </div>

            {/* Client ID Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Google OAuth Client ID
              </label>
              <input
                type="text"
                value={clientIdInput}
                onChange={e => setClientIdInput(e.target.value)}
                placeholder="e.g. 123456789-abc123xyz.apps.googleusercontent.com"
                disabled={!canUserEdit}
                className="config-input"
                style={{ opacity: canUserEdit ? 1 : 0.6 }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Create a web client credential in your Google Cloud Console.
              </span>
            </div>

            {/* Allowed Domains Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Restricted Email Domains (Optional)
              </label>
              <input
                type="text"
                value={allowedDomainsInput}
                onChange={e => setAllowedDomainsInput(e.target.value)}
                placeholder="e.g. gmail.com, yourcompany.com (comma separated)"
                disabled={!canUserEdit}
                className="config-input"
                style={{ opacity: canUserEdit ? 1 : 0.6 }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Leave empty to allow any Google account. Separated by commas.
              </span>
            </div>

            {/* Action Buttons */}
            {canUserEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ padding: '8px 24px', borderRadius: '10px' }}
                >
                  Save Config
                </button>
                {isSaved && (
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600, animation: 'fadeIn 0.2s' }}>
                    ✓ Settings saved to MongoDB
                  </span>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Setup Guide Card */}
        <SectionCard
          icon={<Key size={16} />}
          title="Google Console Setup Guide"
          subtitle="Follow these steps to generate and configure your OAuth Credentials"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            
            <div style={{ background: 'var(--background-alt)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>Important Origin Settings</h4>
              <p style={{ margin: 0, fontSize: '0.775rem' }}>
                Google OAuth requires matching domains. Ensure your site origins are added correctly in the console credentials.
              </p>
            </div>

            <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <strong>Go to Google Cloud Console:</strong>
                <div>Navigate to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>console.cloud.google.com</a>.</div>
              </li>
              <li>
                <strong>Create/Select Project:</strong>
                <div>Create a new project or select your existing portal operations project.</div>
              </li>
              <li>
                <strong>Configure OAuth Consent Screen:</strong>
                <div>Go to <strong>APIs & Services &gt; OAuth consent screen</strong>, select <strong>External</strong>, and fill in application metadata (App name, support email).</div>
              </li>
              <li>
                <strong>Create Web Client ID:</strong>
                <div>Go to <strong>Credentials</strong>, click <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>. Set Application type to <strong>Web application</strong>.</div>
              </li>
              <li>
                <strong>Configure Authorized Origins:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span>Under <strong>Authorized JavaScript origins</strong>, add:</span>
                  <code style={{ background: 'var(--background-alt)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)', fontSize: '0.75rem', width: 'fit-content' }}>
                    {window.location.origin}
                  </code>
                </div>
              </li>
              <li>
                <strong>Copy Client ID:</strong>
                <div>Save changes and copy the generated <strong>Client ID</strong> into the form on the left.</div>
              </li>
            </ol>
          </div>
        </SectionCard>

      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — tabbed layout
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SHARABLE CALENDAR SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const CalendarConfigSection: React.FC = () => {
  const { 
    sharableCalendarSources, 
    updateSharableCalendarSources, 
    sharableCalendarStages,
    updateSharableCalendarStages,
    canUserEdit 
  } = useDashboard();

  const [sources, setSources] = useState<string[]>(() => {
    return sharableCalendarSources ? sharableCalendarSources.split(',') : [];
  });

  const [stages, setStages] = useState<string[]>(() => {
    return sharableCalendarStages ? sharableCalendarStages.split(',') : ['Specs', 'UI/UX', 'Dev', 'Release'];
  });

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setSources(sharableCalendarSources ? sharableCalendarSources.split(',') : []);
  }, [sharableCalendarSources]);

  React.useEffect(() => {
    setStages(sharableCalendarStages ? sharableCalendarStages.split(',') : ['Specs', 'UI/UX', 'Dev', 'Release']);
  }, [sharableCalendarStages]);

  const toggleSource = (sourceId: string) => {
    if (!canUserEdit) return;
    setSources(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(s => s !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  const toggleStage = (stageId: string) => {
    if (!canUserEdit) return;
    setStages(prev => {
      if (prev.includes(stageId)) {
        return prev.filter(s => s !== stageId);
      } else {
        return [...prev, stageId];
      }
    });
  };

  const handleSave = () => {
    if (!canUserEdit) return;
    updateSharableCalendarSources(sources.join(','));
    updateSharableCalendarStages(stages.join(','));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const publicUrl = `${window.location.origin}/?public-calendar=true`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const CALENDAR_SOURCES = [
    { id: 'product',        label: 'Priority Requests',      description: 'Milestones like Specs, UI/UX, Dev, and Final Release deadlines' },
    { id: 'projects',       label: 'Student Projects',       description: 'Milestones and specs deadlines for student projects' },
    { id: 'meetings',       label: 'AMA & Meetings',         description: 'Scheduled AMA Sessions and Student Meetings deadlines' },
    { id: 'admin',          label: 'Admin Calls',            description: 'Scheduled call dates and follow-up deadlines' },
    { id: 'tarun-meetings', label: 'Tarun Sir Meetings',     description: 'Scheduled meeting dates' },
    { id: 'content',        label: 'Content Pipeline',       description: 'Content publish dates and content dev deadlines' },
    { id: 'issues',         label: 'Daily Issues Log',       description: 'Reported bugs and UX issues resolution deadlines' },
  ];

  return (
    <SectionCard
      icon={<Calendar size={16} />}
      title="Sharable Calendar"
      subtitle="Choose which tabs' tasks are publicly visible and copy the access link"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Sources Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Worksheet Visibility Sources
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Select the worksheets you want to include in the public calendar. Anyone with the public link will be able to view details for tasks from the selected tabs only. All other tabs will remain completely hidden.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
            {CALENDAR_SOURCES.map(source => {
              const isChecked = sources.includes(source.id);
              return (
                <div
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: isChecked ? 'var(--primary-glow)' : 'var(--background-alt)',
                    border: isChecked ? '1px solid var(--primary-border)' : '1px solid var(--border-light)',
                    cursor: canUserEdit ? 'pointer' : 'default',
                    transition: 'all 0.15s'
                  }}
                >
                  <div 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: canUserEdit ? 'pointer' : 'default',
                      userSelect: 'none',
                      flexShrink: 0,
                      marginTop: '3px'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '16px',
                      backgroundColor: isChecked ? 'var(--primary)' : 'var(--text-muted)',
                      borderRadius: '9px',
                      position: 'relative',
                      transition: 'background-color 0.2s'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: isChecked ? '14px' : '2px',
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {source.label}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {source.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Worksheet Date Milestones Section */}
          <h4 style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Worksheet Date Milestones
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Choose which milestones are visible on the sharable calendar. Only selected date fields will appear.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {[
              { id: 'Specs', label: 'Specs Date', description: 'Specs/Product deadline' },
              { id: 'UI/UX', label: 'UI/UX Date', description: 'Design/Prototype milestone' },
              { id: 'Dev',   label: 'Dev Date',   description: 'Development deadline' },
              { id: 'Release', label: 'Release Date', description: 'Final release/Launch' },
            ].map(stage => {
              const isChecked = stages.includes(stage.id);
              return (
                <div
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  style={{
                    flex: '1 1 200px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: isChecked ? 'var(--primary-glow)' : 'var(--background-alt)',
                    border: isChecked ? '1px solid var(--primary-border)' : '1px solid var(--border-light)',
                    cursor: canUserEdit ? 'pointer' : 'default',
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    style={{
                      accentColor: 'var(--primary)',
                      cursor: canUserEdit ? 'pointer' : 'default',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {stage.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          {canUserEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
                style={{ padding: '8px 24px', borderRadius: '10px' }}
              >
                Save Calendar Config
              </button>
              {isSaved && (
                <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600, animation: 'fadeIn 0.2s' }}>
                  ✓ Calendar config saved to MongoDB
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Public Link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Sharable Public URL
          </h4>
          <div style={{ background: 'var(--background-alt)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid var(--primary)', border: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 700 }}>Zero Login Access</h5>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              People visiting this link do not need a Google Account or registered email. They will receive a read-only calendar view.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Public Calendar URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={publicUrl}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--background-alt)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.775rem',
                  color: 'var(--text-secondary)',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: '#b45309' }}>
              <span style={{ fontWeight: 700 }}>Security Note</span>
              <span>ClickUp tasks and draft content links are accessible if task URLs exist. Ensure only appropriate tasks are published.</span>
            </div>
          </div>
        </div>

      </div>
    </SectionCard>
  );
};


const EmailDigestSettingsSection: React.FC = () => {
  const {
    digestRecipient, updateDigestRecipient,
    digestAppUrl, updateDigestAppUrl,
    digestSMTPHost, updateDigestSMTPHost,
    digestSMTPPort, updateDigestSMTPPort,
    digestSMTPUser, updateDigestSMTPUser,
    digestSMTPPass, updateDigestSMTPPass,
    digestFrequency, updateDigestFrequency,
    digestTime, updateDigestTime,
    digestDayOfWeek, updateDigestDayOfWeek,
    canUserEdit,
    sendEmailDigest
  } = useDashboard();

  const [recipient, setRecipient] = useState(digestRecipient);
  const [appUrl, setAppUrl] = useState(digestAppUrl);
  const [smtpHost, setSmtpHost] = useState(digestSMTPHost);
  const [smtpPort, setSmtpPort] = useState(digestSMTPPort);
  const [smtpUser, setSmtpUser] = useState(digestSMTPUser);
  const [smtpPass, setSmtpPass] = useState(digestSMTPPass);
  const [frequency, setFrequency] = useState(digestFrequency);
  const [deliveryTime, setDeliveryTime] = useState(digestTime);
  const [dayOfWeek, setDayOfWeek] = useState(digestDayOfWeek);
  const [isSaved, setIsSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ success: boolean; message: string; testLink?: string } | null>(null);

  useEffect(() => {
    setRecipient(digestRecipient);
    setAppUrl(digestAppUrl);
    setSmtpHost(digestSMTPHost);
    setSmtpPort(digestSMTPPort);
    setSmtpUser(digestSMTPUser);
    setSmtpPass(digestSMTPPass);
    setFrequency(digestFrequency);
    setDeliveryTime(digestTime);
    setDayOfWeek(digestDayOfWeek);
  }, [digestRecipient, digestAppUrl, digestSMTPHost, digestSMTPPort, digestSMTPUser, digestSMTPPass, digestFrequency, digestTime, digestDayOfWeek]);

  const handleSave = () => {
    if (!canUserEdit) return;
    updateDigestRecipient(recipient.trim());
    updateDigestAppUrl(appUrl.trim());
    updateDigestSMTPHost(smtpHost.trim());
    updateDigestSMTPPort(smtpPort.trim());
    updateDigestSMTPUser(smtpUser.trim());
    updateDigestSMTPPass(smtpPass.trim());
    updateDigestFrequency(frequency);
    updateDigestTime(deliveryTime);
    updateDigestDayOfWeek(dayOfWeek);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSend = async () => {
    setIsSending(true);
    setSendFeedback(null);
    try {
      const res = await sendEmailDigest();
      setSendFeedback(res);
    } catch (e: any) {
      setSendFeedback({ success: false, message: e.message || 'Error occurred.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    const targetEmail = prompt('Enter the email address you want to send the test digest to:', recipient || '');
    if (!targetEmail || !targetEmail.trim()) return;

    setIsSending(true);
    setSendFeedback(null);
    try {
      const res = await sendEmailDigest(targetEmail.trim());
      setSendFeedback(res);
    } catch (e: any) {
      setSendFeedback({ success: false, message: e.message || 'Error occurred.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', width: '100%', gap: '2rem', padding: '2rem', overflowY: 'auto', alignItems: 'flex-start' }}>
        {/* Left Side: Form Controls */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionCard
            icon={<Mail size={16} />}
            title="Email Digest Configurations"
            subtitle="Configure recipient and SMTP settings for the product shipments digest"
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              SMTP Sender & Recipient Configurations
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Digest Recipient Email
              </label>
              <input
                type="email"
                className="config-input"
                placeholder="e.g. founder@company.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Multiple emails can be separated by commas
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Application Base URL
              </label>
              <input
                type="text"
                className="config-input"
                placeholder="e.g. https://productship-console.vercel.app"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Live URL of the console used for links in email digests (falls back to request host if empty)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g. smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Port
                </label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="465"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  SMTP User (Email)
                </label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g. operations@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  SMTP Password / App Token
                </label>
                <input
                  type="password"
                  className="config-input"
                  placeholder="••••••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </div>
            </div>

            {/* Scheduler Configuration Section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h5 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 Automated Schedule Settings
              </h5>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Frequency
                  </label>
                  <select
                    className="config-input"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', outline: 'none' }}
                  >
                    <option value="everyday">Everyday</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    className="config-input"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                  />
                </div>
              </div>

              {frequency === 'weekly' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Preferred Day of Week
                  </label>
                  <select
                    className="config-input"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', outline: 'none' }}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              )}
            </div>

            {canUserEdit && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '8px 18px', borderRadius: '8px' }}
                >
                  Save Configurations
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !recipient}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                >
                  {isSending ? 'Sending...' : 'Send Live Digest Now'}
                </button>

                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSending}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--text-secondary)', color: 'var(--text-secondary)' }}
                >
                  Send Test Email
                </button>

                {isSaved && (
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✓ Saved
                  </span>
                )}
              </div>
            )}

            {sendFeedback && (
              <div style={{
                marginTop: '0.5rem',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: sendFeedback.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${sendFeedback.success ? 'var(--success)' : 'var(--danger)'}`,
                fontSize: '0.8rem',
                color: sendFeedback.success ? 'var(--success)' : 'var(--danger)'
              }}>
                <span style={{ fontWeight: 600 }}>{sendFeedback.success ? 'Success: ' : 'Error: '}</span>
                {sendFeedback.message}
                {sendFeedback.testLink && (
                  <div style={{ marginTop: '6px' }}>
                    <a
                      href={sendFeedback.testLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Open Ethereal Test Inbox (Preview Mail) ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

        {/* Right Side: Live Email Preview */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '400px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="var(--primary)" /> Active Email Digest Template
          </h3>
          
          {/* Mock Email Client Container */}
          <div style={{
            border: '1.5px solid var(--border)',
            borderRadius: '12px',
            background: 'var(--panel-bg)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '600px'
          }}>
            {/* Window header */}
            <div style={{
              background: 'var(--background-alt)',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px', fontWeight: 500 }}>
                Operations Status Digest Preview
              </span>
            </div>

            {/* Email Metadata */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--panel-bg)'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {smtpUser ? `ProductShip Console <${smtpUser}>` : 'ProductShip Console <digest@productship.com>'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {recipient || 'Tarun Sir & Team <recipient@company.com>'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Subject:</span>{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  🚢 ProductShip Digest — Feature Delivery & Status
                </span>
              </div>
            </div>

            {/* Email Content Frame */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8fafc',
              overflowY: 'auto'
            }}>
              {/* Actual HTML Email Design */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                padding: '20px',
                color: '#334155',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                {/* Logo / Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #7c3aed', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px' }}>🚢</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ProductShip
                    </h2>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                      Feature Delivery & Status Sync
                    </span>
                  </div>
                </div>

                <p style={{ margin: '0 0 12px 0', color: '#475569', fontWeight: 500 }}>
                  Hello team,
                </p>
                <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '12px' }}>
                  Here is the summary of feature shipments and operational metrics. Please review the digest below:
                </p>

                {/* Analytics Status Banner UIUX Preview */}
                <div style={{ padding: '0 0 20px 0' }}>
                  <div style={{
                    border: '1px solid #fee2e2',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)',
                    backgroundColor: '#fff5f5',
                    padding: '18px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}>
                    {/* Badge */}
                    <div style={{ display: 'inline-block', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', padding: '3px 10px', borderRadius: '20px', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", marginBottom: '10px' }}>
                      ⚠️ Attention Required
                    </div>
                    
                    {/* Main Metric Percentage */}
                    <div style={{ fontSize: '42px', fontWeight: 800, color: '#0f172a', lineHeight: 1, margin: '2px 0', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                      50%
                    </div>
                    
                    {/* Label */}
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                      Overall Task Release Rate
                    </div>

                    {/* Progress Bar Track */}
                    <div style={{ backgroundColor: '#fecaca', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '8px', display: 'flex' }}>
                      {/* Progress Bar Fill */}
                      <div style={{ width: '50%', backgroundColor: '#dc2626', borderRadius: '10px', height: '8px' }} />
                    </div>

                    {/* Released (Total Tasks) stat */}
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                      🚀 Released (Total Tasks): <span style={{ color: '#dc2626' }}>10 / 20</span>
                    </div>

                    {/* Status Description Message */}
                    <div style={{ fontSize: '11.5px', lineHeight: 1.4, color: '#334155', maxWidth: '380px', margin: '0 auto', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                      System status is warm. Release rate is below target. Action needed to resolve blockers and accelerate pending tasks.
                    </div>
                  </div>
                </div>



                {/* DIGEST TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        Operation / Call Log
                      </th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', width: '90px' }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', width: '90px' }}>
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                        👑 Tarun Sir Meetings <span style={{ fontWeight: 400, color: '#64748b', fontSize: '11px' }}>(3 calls)</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#f97316' }}>
                        10 / 20 pending
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ width: '50%', backgroundColor: '#f97316', height: '100%', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>50%</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                        📞 Weekly Calls <span style={{ fontWeight: 400, color: '#64748b', fontSize: '11px' }}>(5 calls)</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#f97316' }}>
                        8 / 15 pending
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ width: '47%', backgroundColor: '#f97316', height: '100%', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>47%</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                        🎥 AMA Sessions <span style={{ fontWeight: 400, color: '#64748b', fontSize: '11px' }}>(0 sessions)</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        0 / 0 pending
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', backgroundColor: '#2563eb', height: '100%', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>100%</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                        ⚠️ Daily Issues Log
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                        8 / 12 unresolved
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ width: '33%', backgroundColor: '#ef4444', height: '100%', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>33%</span>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#faf5ff' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#7c3aed' }}>
                        🚀 Released (Last 30 Days)
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#7c3aed', fontSize: '13px' }}>
                        5 tasks
                      </td>
                      <td style={{ padding: '10px 12px' }} />
                    </tr>
                  </tbody>
                </table>

                {/* Visual Chart Section */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💬</span> User & Student Feedback Radar
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* AMA Sessions Card */}
                    <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>AMA Sessions Rating</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>—</span>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '12px', letterSpacing: '1px' }}>☆☆☆☆☆</div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>0 feedback submissions</div>
                    </div>

                    {/* Weekly Calls Card */}
                    <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Weekly Calls Rating</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>4.5</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>/ 5.0</span>
                      </div>
                      <div style={{ color: '#fbbf24', fontSize: '12px', letterSpacing: '1px' }}>★★★★★</div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>15 feedback submissions</div>
                    </div>
                  </div>
                </div>

                {/* Call to action button */}
                <div style={{ textAlign: 'center', margin: '20px 0 12px 0' }}>
                  <span
                    style={{
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '8px 20px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'inline-block',
                      cursor: 'default'
                    }}
                  >
                    Open Product Ship
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '18px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                  This digest was auto-generated by the internal Product Tool. To manage email subscriptions, go to the Configuration portal.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


const IntegrationsSection: React.FC = () => {
  const [subTab, setSubTab] = useState<'clickup' | 'security' | 'email'>('clickup');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border)', 
        padding: '0.25rem 2rem 0 2rem', 
        background: 'var(--panel-bg)', 
        gap: '1.5rem' 
      }}>
        <button
          onClick={() => setSubTab('clickup')}
          style={{
            padding: '0.75rem 0.5rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'clickup' ? '2px solid var(--primary)' : '2px solid transparent',
            color: subTab === 'clickup' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          ClickUp Integration
        </button>
        <button
          onClick={() => setSubTab('security')}
          style={{
            padding: '0.75rem 0.5rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
            color: subTab === 'security' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Form Security
        </button>
        <button
          onClick={() => setSubTab('email')}
          style={{
            padding: '0.75rem 0.5rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'email' ? '2px solid var(--primary)' : '2px solid transparent',
            color: subTab === 'email' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Email Digest
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {subTab === 'clickup' ? (
          <ClickupSettingsSection />
        ) : subTab === 'security' ? (
          <FormSecuritySection />
        ) : (
          <EmailDigestSettingsSection />
        )}
      </div>
    </div>
  );
};


const GroupsAndStatusesSection: React.FC = () => {
  const [subTab, setSubTab] = useState<'groups' | 'statuses'>('groups');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border)', 
        padding: '0.25rem 2rem 0 2rem', 
        background: 'var(--panel-bg)', 
        gap: '1.5rem' 
      }}>
        <button
          onClick={() => setSubTab('groups')}
          style={{
            padding: '0.75rem 0.5rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'groups' ? '2px solid var(--primary)' : '2px solid transparent',
            color: subTab === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Product Groups
        </button>
        <button
          onClick={() => setSubTab('statuses')}
          style={{
            padding: '0.75rem 0.5rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'statuses' ? '2px solid var(--primary)' : '2px solid transparent',
            color: subTab === 'statuses' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Statuses
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {subTab === 'groups' ? (
          <ProductGroupsSection />
        ) : (
          <StatusesSection />
        )}
      </div>
    </div>
  );
};


type ConfigTab = 'speakers' | 'groups' | 'statuses' | 'programs' | 'integrations' | 'forms' | 'calendar';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'speakers', label: 'POC Owners / Speakers', icon: <Users size={15} /> },
  { id: 'groups',   label: 'Groups & Statuses',      icon: <Layers size={15} /> },
  { id: 'programs', label: 'Programs & Cohorts',     icon: <Layers size={15} /> },
  { id: 'integrations', label: 'Integrations',       icon: <Link size={15} /> },
  { id: 'forms',    label: 'Form Builder',           icon: <ClipboardList size={15} /> },
  { id: 'calendar', label: 'Sharable Calendar',      icon: <Calendar size={15} /> },
];

const LockedIntegrationsView: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '4rem 2rem',
      textAlign: 'center',
      background: 'var(--background-alt)',
      borderRadius: '12px',
      margin: '1.5rem 2rem',
      border: '1px solid var(--border-light)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        color: 'var(--danger)',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 16px rgba(0,0,0,0.03)'
      }}>
        <Lock size={32} />
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Integrations Locked
      </h3>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.5' }}>
        You do not have the required administrative permissions to view or configure ClickUp integrations. Please contact a system administrator if you require access.
      </p>
    </div>
  );
};


export const ConfigSection: React.FC = () => {
  const { currentUser } = useDashboard();
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;
  const [activeTab, setActiveTab] = useState<ConfigTab>('speakers');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--panel-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {CONFIG_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const isLocked = tab.id === 'integrations' && !isCurrentUserAdmin;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 18px',
                  border: 'none',
                  borderRadius: '10px 10px 0 0',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--background)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.18s',
                  position: 'relative',
                  bottom: -1,
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {isLocked ? <Lock size={15} style={{ color: 'var(--text-muted)' }} /> : tab.icon}
                {tab.label} {isLocked && ' 🔒'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Active section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'speakers' && <SpeakersSection />}
          {activeTab === 'groups' && <GroupsAndStatusesSection />}
          {activeTab === 'programs' && <ProgramsSection />}
          {activeTab === 'integrations' && (
            isCurrentUserAdmin ? <IntegrationsSection /> : <LockedIntegrationsView />
          )}
          {activeTab === 'forms' && <FormBuilderSection />}
          {activeTab === 'calendar' && <CalendarConfigSection />}
        </div>
      </div>
    </div>
  );
};
