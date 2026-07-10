import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ConfigSpeaker, ConfigProductGroup, ConfigStatus, ConfigProgram, ConfigCohort, FeedbackFormField } from '../types';
import { Plus, Trash2, Check, X, Pencil, Users, Layers, Tag, Settings, Key, Eye, EyeOff, RefreshCw, AlertCircle, ClipboardList, ChevronUp, ChevronDown, Shield } from 'lucide-react';

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
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
        </div>
      </div>
      {actionButton && (
        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {actionButton}
        </div>
      )}
    </div>
    <div className="table-responsive" style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
      {children}
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
  const [editPassword, setEditPassword] = useState('');
  const [editCanEdit, setEditCanEdit] = useState(true);
  const [editIsAdmin, setEditIsAdmin] = useState(true);

  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addPassword, setAddPassword] = useState('1234');
  const [addCanEdit, setAddCanEdit] = useState(true);
  const [addIsAdmin, setAddIsAdmin] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Visibility toggles for passwords
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showAddPassword, setShowAddPassword] = useState(false);

  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (s: ConfigSpeaker) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditEmail(s.email ?? '');
    setEditRole(s.role ?? '');
    setEditPassword(s.password ?? '1234');
    setEditCanEdit(s.canEdit !== false);
    setEditIsAdmin(s.isAdmin !== false);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateSpeaker(editingId, { 
      name: editName.trim(), 
      email: editEmail.trim(), 
      role: editRole.trim(), 
      password: editPassword.trim(),
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
      password: addPassword.trim() || '1234',
      canEdit: addCanEdit,
      isAdmin: addIsAdmin
    });
    setAddName('');
    setAddEmail('');
    setAddRole('');
    setAddPassword('1234');
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
            <th style={{ width: 150 }}>Password</th>
            <th style={{ width: 90, textAlign: 'center' }}>Can Edit</th>
            <th style={{ width: 90, textAlign: 'center' }}>Admin</th>
            <th style={{ width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {speakers.map(s => {
            const isSelf = currentUser && currentUser.id === s.id;
            const canViewOrEditPassword = isCurrentUserAdmin || isSelf;

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
                      placeholder="Email address…"
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
                <td>
                  {editingId === s.id ? (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPasswordMap[s.id] ? 'text' : 'password'}
                        className="config-input"
                        style={{ paddingRight: '30px' }}
                        value={editPassword}
                        disabled={!canViewOrEditPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder="Password"
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      {canViewOrEditPassword && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(s.id)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                          }}
                        >
                          {showPasswordMap[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        letterSpacing: (showPasswordMap[s.id] && canViewOrEditPassword) ? 'normal' : '0.15em',
                        fontFamily: (showPasswordMap[s.id] && canViewOrEditPassword) ? 'Outfit, sans-serif' : 'monospace',
                        color: (showPasswordMap[s.id] && canViewOrEditPassword) ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                        {(showPasswordMap[s.id] && canViewOrEditPassword) ? (s.password || '1234') : '••••••'}
                      </span>
                      {canViewOrEditPassword && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                          }}
                          title={showPasswordMap[s.id] ? 'Hide Password' : 'Show Password'}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--background-alt)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {showPasswordMap[s.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editingId === s.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: '16px', height: '16px', cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                        checked={editCanEdit}
                        disabled={!isCurrentUserAdmin}
                        onChange={e => setEditCanEdit(e.target.checked)}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: '16px', height: '16px', cursor: 'default' }}
                        checked={s.canEdit !== false}
                        disabled
                      />
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editingId === s.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: '16px', height: '16px', cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                        checked={editIsAdmin}
                        disabled={!isCurrentUserAdmin}
                        onChange={e => setEditIsAdmin(e.target.checked)}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: '16px', height: '16px', cursor: 'default' }}
                        checked={s.isAdmin !== false}
                        disabled
                      />
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
                  placeholder="Email address…"
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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    className="config-input"
                    style={{ paddingRight: '30px' }}
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder="Password (default 1234)"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setShowAdd(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showAddPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={addCanEdit}
                    onChange={e => setAddCanEdit(e.target.checked)}
                  />
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={addIsAdmin}
                    onChange={e => setAddIsAdmin(e.target.checked)}
                  />
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
    addProgram({ id: `prog-${Date.now()}`, name: newProgramName.trim() });
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
    addCohort({ id: `coh-${Date.now()}`, name: newCohortName.trim(), programId });
    setNewCohortName('');
    setAddingCohortForProgramId(null);
  };

  const actionButton = !showAddProgram && canUserEdit ? (
    <button
      onClick={() => { setShowAddProgram(true); setNewProgramName(''); }}
      className="btn btn-primary btn-sm"
    >
      <Plus size={14} /> Add Program
    </button>
  ) : null;

  return (
    <SectionCard
      icon={<Layers size={16} />}
      title="Programs & Cohorts"
      subtitle="Manage academic programs and their associated student cohorts/sections"
      actionButton={actionButton}
    >
      <table className="grid-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Program</th>
            <th>Cohorts</th>
            <th style={{ width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {programs.map(p => {
            const programCohorts = cohorts.filter(c => c.programId === p.id);
            return (
              <tr key={p.id} style={{ verticalAlign: 'top' }}>
                {/* Program name cell */}
                <td style={{ paddingTop: '0.85rem' }}>
                  {editingProgramId === p.id ? (
                    <input
                      autoFocus
                      className="config-input"
                      style={{ width: '100%' }}
                      value={editProgramName}
                      onChange={e => setEditProgramName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveProgramEdit();
                        if (e.key === 'Escape') setEditingProgramId(null);
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', fontFamily: 'Outfit' }}>{p.name}</span>
                  )}
                </td>

                {/* Cohorts cell — list view */}
                <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                  {programCohorts.length === 0 && addingCohortForProgramId !== p.id && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', padding: '0.4rem 0' }}>No cohorts yet</span>
                  )}

                  {/* Cohort list rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {programCohorts.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--background)',
                        border: `1px solid ${c.active !== false ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: '8px',
                        padding: '5px 10px',
                        transition: 'all 0.15s',
                        opacity: c.active !== false ? 1 : 0.7,
                      }}>

                        {/* Active / Inactive toggle */}
                        <label
                          title={c.active !== false ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: canUserEdit ? 'pointer' : 'default', userSelect: 'none', flexShrink: 0 }}
                        >
                          <input
                            type="checkbox"
                            checked={c.active !== false}
                            onChange={() => canUserEdit && updateCohort(c.id, { active: c.active === false })}
                            disabled={!canUserEdit}
                            style={{ display: 'none' }}
                          />
                          {/* Custom toggle pill */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            width: 36, height: 18, borderRadius: 9,
                            background: c.active !== false ? 'var(--primary)' : '#6b7280',
                            position: 'relative',
                            transition: 'background 0.2s',
                            flexShrink: 0,
                          }}>
                            <span style={{
                              position: 'absolute',
                              left: c.active !== false ? 20 : 2,
                              width: 14, height: 14,
                              borderRadius: '50%',
                              background: '#fff',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            }} />
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: c.active !== false ? 'var(--primary)' : '#6b7280',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            minWidth: 44,
                          }}>
                            {c.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </label>

                        {/* Cohort name / edit input */}
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                            }}>{c.name}</span>
                          )}
                        </div>

                        {/* Row actions */}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
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

                    {/* Add cohort row */}
                    {canUserEdit && (
                      addingCohortForProgramId === p.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '0.15rem' }}>
                          <input
                            autoFocus
                            placeholder="Cohort name…"
                            className="config-input"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
                            value={newCohortName}
                            onChange={e => setNewCohortName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddCohort(p.id);
                              if (e.key === 'Escape') setAddingCohortForProgramId(null);
                            }}
                          />
                          <IconBtn onClick={() => handleAddCohort(p.id)} success title="Add"><Check size={12} /></IconBtn>
                          <IconBtn onClick={() => setAddingCohortForProgramId(null)} title="Cancel"><X size={12} /></IconBtn>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingCohortForProgramId(p.id); setNewCohortName(''); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px',
                            background: 'transparent',
                            border: '1.5px dashed var(--border)',
                            color: 'var(--text-muted)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'all 0.15s',
                            marginTop: '0.15rem',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Plus size={11} /> Add Cohort
                        </button>
                      )
                    )}
                  </div>
                </td>

                {/* Program actions cell */}
                <td style={{ paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {editingProgramId === p.id ? (
                      <>
                        <IconBtn onClick={saveProgramEdit} success title="Save"><Check size={13} /></IconBtn>
                        <IconBtn onClick={() => setEditingProgramId(null)} title="Cancel"><X size={13} /></IconBtn>
                      </>
                    ) : (
                      <>
                        {canUserEdit && <IconBtn onClick={() => startProgramEdit(p)} title="Edit"><Pencil size={13} /></IconBtn>}
                        {canUserEdit && <IconBtn
                          onClick={async () => {
                            if (await confirm(`Delete program "${p.name}"? All its cohorts will also be removed.`, 'Delete Program')) {
                              programCohorts.forEach(c => deleteCohort(c.id));
                              deleteProgram(p.id);
                            }
                          }}
                          danger title="Delete"
                        ><Trash2 size={13} /></IconBtn>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Add Program row */}
          {showAddProgram && (
            <tr>
              <td colSpan={2}>
                <input
                  autoFocus
                  placeholder="Enter program name…"
                  className="config-input"
                  style={{ width: '100%', maxWidth: 320 }}
                  value={newProgramName}
                  onChange={e => setNewProgramName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddProgram();
                    if (e.key === 'Escape') setShowAddProgram(false);
                  }}
                />
              </td>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAddProgram} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAddProgram(false)} title="Cancel"><X size={14} /></IconBtn>
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
// CLICKUP INTEGRATION SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ClickupSettingsSection: React.FC = () => {
  const { clickupApiKey, setClickupApiKey, syncClickupTask, canUserEdit } = useDashboard();
  const [apiKeyInput, setApiKeyInput] = useState(clickupApiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
      
      const status = await syncClickupTask(testLink.trim());
      if (status) {
        setTestResult({
          success: true,
          message: `Successfully connected! Task status is:`,
          status: status
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

        {/* Enabled status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--background-alt)', padding: '1rem', borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <input
            type="checkbox"
            id="form-enabled-toggle"
            checked={enabled}
            disabled={!canUserEdit}
            onChange={e => setEnabled(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: canUserEdit ? 'pointer' : 'default' }}
          />
          <label htmlFor="form-enabled-toggle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: canUserEdit ? 'pointer' : 'default' }}>
            Enable feedback form links for this category
          </label>
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
                    
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: canUserEdit ? 'pointer' : 'default', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={!canUserEdit}
                        onChange={e => handleUpdateField(field.id, { required: e.target.checked })}
                        style={{ cursor: canUserEdit ? 'pointer' : 'default' }}
                      />
                      Required
                    </label>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--background-alt)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <input
                type="checkbox"
                id="requireGoogleLogin"
                checked={requireLoginVal}
                onChange={e => setRequireLoginVal(e.target.checked)}
                disabled={!canUserEdit}
                style={{ width: '18px', height: '18px', cursor: canUserEdit ? 'pointer' : 'not-allowed' }}
              />
              <label htmlFor="requireGoogleLogin" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: canUserEdit ? 'pointer' : 'not-allowed' }}>
                Require Google Login for Feedback Forms
              </label>
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
type ConfigTab = 'speakers' | 'groups' | 'statuses' | 'programs' | 'clickup' | 'forms' | 'security';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'speakers', label: 'POC Owners / Speakers', icon: <Users size={15} /> },
  { id: 'groups',   label: 'Product Groups',         icon: <Layers size={15} /> },
  { id: 'statuses', label: 'Statuses',               icon: <Tag size={15} /> },
  { id: 'programs', label: 'Programs & Cohorts',     icon: <Layers size={15} /> },
  { id: 'clickup',  label: 'ClickUp Integration',    icon: <Settings size={15} /> },
  { id: 'forms',    label: 'Form Builder',           icon: <ClipboardList size={15} /> },
  { id: 'security', label: 'Form Security',          icon: <Shield size={15} /> },
];

export const ConfigSection: React.FC = () => {
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
                {tab.icon}
                {tab.label}
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
          {activeTab === 'groups' && <ProductGroupsSection />}
          {activeTab === 'statuses' && <StatusesSection />}
          {activeTab === 'programs' && <ProgramsSection />}
          {activeTab === 'clickup' && <ClickupSettingsSection />}
          {activeTab === 'forms' && <FormBuilderSection />}
          {activeTab === 'security' && <FormSecuritySection />}
        </div>
      </div>
    </div>
  );
};
