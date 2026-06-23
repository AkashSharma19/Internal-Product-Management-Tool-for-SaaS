import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ConfigSpeaker, ConfigProductGroup, ConfigStatus, ConfigProgram, ConfigCohort } from '../types';
import { Plus, Trash2, Check, X, Pencil, Users, Layers, Tag, Settings, Key, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';

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
const SectionCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }> = ({
  icon, title, subtitle, children
}) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  }}>
    {/* Header */}
    <div style={{
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-elevated)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{
        width: 36, height: 36,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #4f46e5))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
      </div>
    </div>
    <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
      {children}
    </div>
  </div>
);

// ─── Shared input style ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--background)',
  border: '1.5px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.82rem',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
};

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

// ─── TABLE STYLES ─────────────────────────────────────────────────────────────
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px',
  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
};
const td: React.CSSProperties = {
  padding: '9px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  fontSize: '0.83rem',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEAKERS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const SpeakersSection: React.FC = () => {
  const { speakers, addSpeaker, updateSpeaker, deleteSpeaker, canUserEdit } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanEdit, setEditCanEdit] = useState(true);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addPassword, setAddPassword] = useState('1234');
  const [addCanEdit, setAddCanEdit] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Visibility toggles for passwords
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showAddPassword, setShowAddPassword] = useState(false);

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
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateSpeaker(editingId, { 
      name: editName.trim(), 
      email: editEmail.trim(), 
      role: editRole.trim(), 
      password: editPassword.trim(),
      canEdit: editCanEdit
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
      canEdit: addCanEdit
    });
    setAddName('');
    setAddEmail('');
    setAddRole('');
    setAddPassword('1234');
    setAddCanEdit(true);
    setShowAdd(false);
  };

  return (
    <SectionCard icon={<Users size={16} />} title="POC Owners / Speakers" subtitle="Manage the speaker & owner list used across all dropdowns">
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role / Title</th>
            <th style={{ ...th, width: 150 }}>Password</th>
            <th style={{ ...th, width: 90, textAlign: 'center' }}>Can Edit</th>
            <th style={{ ...th, width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {speakers.map(s => (
            <tr key={s.id} style={{ transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={td}>
                {editingId === s.id
                  ? <input autoFocus style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <span style={{ fontWeight: 500 }}>{s.name}</span>}
              </td>
              <td style={td}>
                {editingId === s.id
                  ? <input style={inputStyle} value={editEmail} onChange={e => setEditEmail(e.target.value)}
                      placeholder="Email address…"
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{s.email || '—'}</span>}
              </td>
              <td style={td}>
                {editingId === s.id
                  ? <input style={inputStyle} value={editRole} onChange={e => setEditRole(e.target.value)}
                      placeholder="e.g. Professor, Finance"
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.role || '—'}</span>}
              </td>
              <td style={td}>
                {editingId === s.id ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                     <input 
                      type={showPasswordMap[s.id] ? 'text' : 'password'}
                      style={{ ...inputStyle, paddingRight: '30px' }} 
                      value={editPassword} 
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="Password"
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} 
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(s.id)}
                      style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showPasswordMap[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', letterSpacing: showPasswordMap[s.id] ? 'normal' : '0.15em', fontFamily: showPasswordMap[s.id] ? 'Outfit, sans-serif' : 'monospace', color: showPasswordMap[s.id] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {showPasswordMap[s.id] ? (s.password || '1234') : '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title={showPasswordMap[s.id] ? "Hide Password" : "Show Password"}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {showPasswordMap[s.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                )}
              </td>
              <td style={td}>
                {editingId === s.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      checked={editCanEdit} 
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
              <td style={{ ...td, borderBottom: 'none' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {editingId === s.id ? (
                    <>
                      <IconBtn onClick={saveEdit} success title="Save"><Check size={14} /></IconBtn>
                      <IconBtn onClick={() => { setEditingId(null); }} title="Cancel"><X size={14} /></IconBtn>
                    </>
                  ) : (
                    <>
                      {canUserEdit && <IconBtn onClick={() => startEdit(s)} title="Edit"><Pencil size={14} /></IconBtn>}
                      {canUserEdit && <IconBtn onClick={() => deleteSpeaker(s.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {/* Add row */}
          {showAdd && (
            <tr>
              <td style={td}>
                <input autoFocus style={inputStyle} value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="Speaker name…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
              </td>
              <td style={td}>
                <input style={inputStyle} value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  placeholder="Email address…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
              </td>
              <td style={td}>
                <input style={inputStyle} value={addRole} onChange={e => setAddRole(e.target.value)}
                  placeholder="Role / Title (optional)"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
              </td>
              <td style={td}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showAddPassword ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '30px' }} 
                    value={addPassword} 
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder="Password (default 1234)"
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {showAddPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    checked={addCanEdit} 
                    onChange={e => setAddCanEdit(e.target.checked)} 
                  />
                </div>
              </td>
              <td style={{ ...td, borderBottom: 'none' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!showAdd && canUserEdit && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={14} /> Add Speaker
        </button>
      )}
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
  const [editModules, setEditModules] = useState('');
  const [addName, setAddName] = useState('');
  const [addColor, setAddColor] = useState('#6366f1');
  const [addModules, setAddModules] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showSwatchFor, setShowSwatchFor] = useState<string | null>(null); // 'edit' | 'add'

  const startEdit = (g: ConfigProductGroup) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditColor(g.color);
    setEditModules(g.modules ? g.modules.join(', ') : '');
    setShowSwatchFor(null);
  };
  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    const modulesArr = editModules.split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
    updateProductGroup(editingId, { name: editName.trim(), color: editColor, modules: modulesArr });
    setEditingId(null);
    setShowSwatchFor(null);
  };
  const handleAdd = () => {
    if (!addName.trim()) return;
    const modulesArr = addModules.split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
    addProductGroup({ 
      id: `pg-${Date.now()}`, 
      name: addName.trim(), 
      color: addColor,
      modules: modulesArr 
    });
    setAddName('');
    setAddColor('#6366f1');
    setAddModules('');
    setShowAdd(false);
    setShowSwatchFor(null);
  };

  return (
    <SectionCard icon={<Layers size={16} />} title="Product Groups" subtitle="Define product areas used across the Priority Requests tracker">
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Product Group</th>
            <th style={{ ...th, width: 90 }}>Colour</th>
            <th style={{ ...th, width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {productGroups.map(g => (
            <tr key={g.id}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ transition: 'background 0.15s' }}
            >
              <td style={td}>
                {editingId === g.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input autoFocus style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Product group name..."
                      onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }} />
                    <input style={inputStyle} value={editModules} onChange={e => setEditModules(e.target.value)}
                      placeholder="Modules (comma-separated)..."
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  </div>
                ) : (
                  <div>
                    <Badge color={g.color} label={g.name} />
                    {g.modules && g.modules.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', paddingLeft: '4px' }}>
                        {g.modules.map((m, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.65rem',
                            backgroundColor: 'var(--background-alt)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td style={td}>
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
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
              <td style={{ ...td, borderBottom: 'none' }}>
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
              <td style={td}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input autoFocus style={inputStyle} value={addName} onChange={e => setAddName(e.target.value)}
                    placeholder="Group name…"
                    onKeyDown={e => { if (e.key === 'Escape') setShowAdd(false); }} />
                  <input style={inputStyle} value={addModules} onChange={e => setAddModules(e.target.value)}
                    placeholder="Modules (comma-separated)…"
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
                </div>
              </td>
              <td style={td}>
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
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                      <ColorSwatch value={addColor} onChange={c => { setAddColor(c); setShowSwatchFor(null); }} />
                    </div>
                  )}
                </div>
              </td>
              <td style={{ ...td, borderBottom: 'none' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!showAdd && canUserEdit && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={14} /> Add Product Group
        </button>
      )}
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSES SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const SCOPE_LABELS: Record<ConfigStatus['scope'], string> = {
  product: 'Priority Requests',
  ama: 'AMA / Schedule',
  student: 'Student Projects',
  content: 'Content Pipeline',
  all: 'All Sections',
};

const StatusesSection: React.FC = () => {
  const { statuses, addStatus, updateStatus, deleteStatus, canUserEdit } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editScope, setEditScope] = useState<ConfigStatus['scope']>('all');
  const [addLabel, setAddLabel] = useState('');
  const [addColor, setAddColor] = useState('#6366f1');
  const [addScope, setAddScope] = useState<ConfigStatus['scope']>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showSwatchFor, setShowSwatchFor] = useState<string | null>(null);

  const startEdit = (s: ConfigStatus) => {
    setEditingId(s.id);
    setEditLabel(s.label);
    setEditColor(s.color);
    setEditScope(s.scope);
    setShowSwatchFor(null);
  };
  const saveEdit = () => {
    if (!editLabel.trim() || !editingId) return;
    updateStatus(editingId, { label: editLabel.trim(), color: editColor, scope: editScope });
    setEditingId(null);
  };
  const handleAdd = () => {
    if (!addLabel.trim()) return;
    addStatus({ id: `st-${Date.now()}`, label: addLabel.trim(), color: addColor, scope: addScope });
    setAddLabel('');
    setAddColor('#6366f1');
    setAddScope('all');
    setShowAdd(false);
    setShowSwatchFor(null);
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: 'auto',
    minWidth: 140,
    cursor: 'pointer',
  };

  return (
    <SectionCard icon={<Tag size={16} />} title="Statuses" subtitle="Manage status labels and where they appear across the dashboard">
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Label</th>
            <th style={{ ...th, width: 90 }}>Colour</th>
            <th style={{ ...th, width: 160 }}>Scope</th>
            <th style={{ ...th, width: 72 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map(s => (
            <tr key={s.id}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ transition: 'background 0.15s' }}
            >
              <td style={td}>
                {editingId === s.id
                  ? <input autoFocus style={inputStyle} value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <Badge color={s.color} label={s.label} />}
              </td>
              <td style={td}>
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
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
              <td style={td}>
                {editingId === s.id
                  ? (
                    <select style={selectStyle} value={editScope} onChange={e => setEditScope(e.target.value as ConfigStatus['scope'])}>
                      <option value="product">Priority Requests</option>
                      <option value="ama">AMA / Schedule</option>
                      <option value="student">Student Projects</option>
                      <option value="content">Content Pipeline</option>
                      <option value="all">All Sections</option>
                    </select>
                  )
                  : <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{SCOPE_LABELS[s.scope]}</span>}
              </td>
              <td style={{ ...td, borderBottom: 'none' }}>
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
              <td style={td}>
                <input autoFocus style={inputStyle} value={addLabel} onChange={e => setAddLabel(e.target.value)}
                  placeholder="Status label…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
              </td>
              <td style={td}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSwatchFor(showSwatchFor === 'add' ? null : 'add')}
                    style={{ width: 24, height: 24, borderRadius: '6px', background: addColor, border: '2px solid var(--border)', cursor: 'pointer' }}
                    title="Pick colour"
                  />
                  {showSwatchFor === 'add' && (
                    <div style={{
                      position: 'absolute', top: 30, left: 0, zIndex: 999,
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                      <ColorSwatch value={addColor} onChange={c => { setAddColor(c); setShowSwatchFor(null); }} />
                    </div>
                  )}
                </div>
              </td>
              <td style={td}>
                <select style={selectStyle} value={addScope} onChange={e => setAddScope(e.target.value as ConfigStatus['scope'])}>
                  <option value="product">Priority Requests</option>
                  <option value="ama">AMA / Schedule</option>
                  <option value="student">Student Projects</option>
                  <option value="content">Content Pipeline</option>
                  <option value="all">All Sections</option>
                </select>
              </td>
              <td style={{ ...td, borderBottom: 'none' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAdd} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAdd(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!showAdd && canUserEdit && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={14} /> Add Status
        </button>
      )}
    </SectionCard>
  );
};

const ProgramsSection: React.FC = () => {
  const { 
    programs, addProgram, updateProgram, deleteProgram,
    cohorts, addCohort, updateCohort, deleteCohort, canUserEdit 
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

  return (
    <SectionCard icon={<Layers size={16} />} title="Programs & Cohorts" subtitle="Manage academic programs and their associated student cohorts/sections">
      <table style={tbl}>
        <thead>
          <tr>
            <th style={{ ...th, width: '28%' }}>Program</th>
            <th style={th}>Cohorts</th>
            <th style={{ ...th, width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {programs.map(p => {
            const programCohorts = cohorts.filter(c => c.programId === p.id);
            return (
              <tr key={p.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{ transition: 'background 0.15s', verticalAlign: 'top' }}
              >
                {/* Program name cell */}
                <td style={{ ...td, paddingTop: '0.85rem' }}>
                  {editingProgramId === p.id ? (
                    <input
                      autoFocus
                      style={{ ...inputStyle, width: '100%' }}
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
                <td style={{ ...td, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
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
                              style={{ ...inputStyle, padding: '2px 6px', fontSize: '0.8rem', width: '100%' }}
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
                            style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
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
                <td style={{ ...td, borderBottom: 'none', paddingTop: '0.75rem' }}>
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
                          onClick={() => {
                            if (window.confirm(`Delete program "${p.name}"? All its cohorts will also be removed.`)) {
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
              <td style={td} colSpan={2}>
                <input
                  autoFocus
                  placeholder="Enter program name…"
                  style={{ ...inputStyle, width: '100%', maxWidth: 320 }}
                  value={newProgramName}
                  onChange={e => setNewProgramName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddProgram();
                    if (e.key === 'Escape') setShowAddProgram(false);
                  }}
                />
              </td>
              <td style={{ ...td, borderBottom: 'none' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={handleAddProgram} success title="Add"><Check size={14} /></IconBtn>
                  <IconBtn onClick={() => setShowAddProgram(false)} title="Cancel"><X size={14} /></IconBtn>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!showAddProgram && canUserEdit && (
        <button
          onClick={() => { setShowAddProgram(true); setNewProgramName(''); }}
          style={{
            marginTop: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={14} /> Add Program
        </button>
      )}
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
              style={{
                ...inputStyle,
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
              style={{
                ...inputStyle,
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
                background: 'var(--surface-elevated)',
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
// MAIN EXPORT — tabbed layout
// ═══════════════════════════════════════════════════════════════════════════════
type ConfigTab = 'speakers' | 'groups' | 'statuses' | 'programs' | 'clickup';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'speakers', label: 'POC Owners / Speakers', icon: <Users size={15} /> },
  { id: 'groups',   label: 'Product Groups',         icon: <Layers size={15} /> },
  { id: 'statuses', label: 'Statuses',               icon: <Tag size={15} /> },
  { id: 'programs', label: 'Programs & Cohorts',     icon: <Layers size={15} /> },
  { id: 'clickup',  label: 'ClickUp Integration',    icon: <Settings size={15} /> },
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {/* Active section */}
        <div>
          {activeTab === 'speakers' && <SpeakersSection />}
          {activeTab === 'groups' && <ProductGroupsSection />}
          {activeTab === 'statuses' && <StatusesSection />}
          {activeTab === 'programs' && <ProgramsSection />}
          {activeTab === 'clickup' && <ClickupSettingsSection />}
        </div>
      </div>
    </div>
  );
};


