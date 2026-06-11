import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ConfigSpeaker, ConfigProductGroup, ConfigStatus, ConfigProgram, ConfigCohort } from '../types';
import { Plus, Trash2, Check, X, Pencil, Settings, Users, Layers, Tag } from 'lucide-react';

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
  const { speakers, addSpeaker, updateSpeaker, deleteSpeaker } = useDashboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const startEdit = (s: ConfigSpeaker) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRole(s.role ?? '');
  };
  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateSpeaker(editingId, { name: editName.trim(), role: editRole.trim() });
    setEditingId(null);
  };
  const handleAdd = () => {
    if (!addName.trim()) return;
    addSpeaker({ id: `spk-${Date.now()}`, name: addName.trim(), role: addRole.trim() });
    setAddName('');
    setAddRole('');
    setShowAdd(false);
  };

  return (
    <SectionCard icon={<Users size={16} />} title="POC Owners / Speakers" subtitle="Manage the speaker & owner list used across all dropdowns">
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Role / Title</th>
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
                  ? <input style={inputStyle} value={editRole} onChange={e => setEditRole(e.target.value)}
                      placeholder="e.g. Professor, Finance"
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.role || '—'}</span>}
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
                      <IconBtn onClick={() => startEdit(s)} title="Edit"><Pencil size={14} /></IconBtn>
                      <IconBtn onClick={() => deleteSpeaker(s.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>
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
                <input style={inputStyle} value={addRole} onChange={e => setAddRole(e.target.value)}
                  placeholder="Role / Title (optional)"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
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

      {!showAdd && (
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
  const { productGroups, addProductGroup, updateProductGroup, deleteProductGroup } = useDashboard();
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
    addProductGroup({ id: `pg-${Date.now()}`, name: addName.trim(), color: addColor });
    setAddName('');
    setAddColor('#6366f1');
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
                {editingId === g.id
                  ? <input autoFocus style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                  : <Badge color={g.color} label={g.name} />}
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
                      <IconBtn onClick={() => startEdit(g)} title="Edit"><Pencil size={14} /></IconBtn>
                      <IconBtn onClick={() => deleteProductGroup(g.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {showAdd && (
            <tr>
              <td style={td}>
                <input autoFocus style={inputStyle} value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="Group name…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }} />
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

      {!showAdd && (
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
  all: 'All Sections',
};

const StatusesSection: React.FC = () => {
  const { statuses, addStatus, updateStatus, deleteStatus } = useDashboard();
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
                      <IconBtn onClick={() => startEdit(s)} title="Edit"><Pencil size={14} /></IconBtn>
                      <IconBtn onClick={() => deleteStatus(s.id)} danger title="Delete"><Trash2 size={14} /></IconBtn>
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

      {!showAdd && (
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
    cohorts, addCohort, updateCohort, deleteCohort 
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
        {programs.map(p => {
          const programCohorts = cohorts.filter(c => c.programId === p.id);
          return (
            <div key={p.id} style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Program Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                {editingProgramId === p.id ? (
                  <input 
                    autoFocus 
                    style={{ ...inputStyle, width: 'calc(100% - 60px)' }} 
                    value={editProgramName} 
                    onChange={e => setEditProgramName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveProgramEdit();
                      if (e.key === 'Escape') setEditingProgramId(null);
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', fontFamily: 'Outfit' }}>{p.name}</span>
                )}

                <div style={{ display: 'flex', gap: '4px' }}>
                  {editingProgramId === p.id ? (
                    <>
                      <IconBtn onClick={saveProgramEdit} success><Check size={13} /></IconBtn>
                      <IconBtn onClick={() => setEditingProgramId(null)} danger><X size={13} /></IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn onClick={() => startProgramEdit(p)}><Pencil size={12} /></IconBtn>
                      <IconBtn onClick={() => {
                        if (window.confirm(`Are you sure you want to delete program "${p.name}"? All cohorts under it will also be deleted.`)) {
                          // Cascade delete cohorts under this program
                          programCohorts.forEach(c => deleteCohort(c.id));
                          deleteProgram(p.id);
                        }
                      }} danger><Trash2 size={12} /></IconBtn>
                    </>
                  )}
                </div>
              </div>

              {/* Cohorts inside Program */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Cohorts ({programCohorts.length})</span>
                {programCohorts.length === 0 ? (
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>No cohorts added yet</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {programCohorts.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        {editingCohortId === c.id ? (
                          <input 
                            autoFocus 
                            style={{ ...inputStyle, padding: '2px 6px', fontSize: '0.775rem' }} 
                            value={editCohortName} 
                            onChange={e => setEditCohortName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveCohortEdit();
                              if (e.key === 'Escape') setEditingCohortId(null);
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.name}</span>
                        )}

                        <div style={{ display: 'flex', gap: '2px' }}>
                          {editingCohortId === c.id ? (
                             <>
                               <IconBtn onClick={saveCohortEdit} success><Check size={11} /></IconBtn>
                               <IconBtn onClick={() => setEditingCohortId(null)} danger><X size={11} /></IconBtn>
                             </>
                           ) : (
                             <>
                               <IconBtn onClick={() => startCohortEdit(c)}><Pencil size={10} /></IconBtn>
                               <IconBtn onClick={() => deleteCohort(c.id)} danger><Trash2 size={10} /></IconBtn>
                             </>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Cohort Inline Input */}
              {addingCohortForProgramId === p.id ? (
                <div style={{ display: 'flex', gap: '4px', marginTop: '0.25rem' }}>
                  <input 
                    autoFocus 
                    placeholder="New cohort name..." 
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.775rem' }} 
                    value={newCohortName} 
                    onChange={e => setNewCohortName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddCohort(p.id);
                      if (e.key === 'Escape') setAddingCohortForProgramId(null);
                    }}
                  />
                  <IconBtn onClick={() => handleAddCohort(p.id)} success><Check size={13} /></IconBtn>
                  <IconBtn onClick={() => setAddingCohortForProgramId(null)} danger><X size={13} /></IconBtn>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingCohortForProgramId(p.id); setNewCohortName(''); }}
                  style={{
                    marginTop: '0.25rem',
                    padding: '6px',
                    background: 'transparent',
                    border: '1.5px dashed var(--border)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Plus size={12} /> Add Cohort
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAddProgram ? (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px', maxWidth: '320px', alignItems: 'center' }}>
          <input 
            autoFocus 
            placeholder="Enter program name..." 
            style={inputStyle} 
            value={newProgramName} 
            onChange={e => setNewProgramName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddProgram();
              if (e.key === 'Escape') setShowAddProgram(false);
            }}
          />
          <IconBtn onClick={handleAddProgram} success><Check size={14} /></IconBtn>
          <IconBtn onClick={() => setShowAddProgram(false)} danger><X size={14} /></IconBtn>
        </div>
      ) : (
        <button
          onClick={() => { setShowAddProgram(true); setNewProgramName(''); }}
          style={{
            marginTop: '1.5rem',
            padding: '8px 16px',
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex', alignItems: 'center', gap: '6px',
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
// MAIN EXPORT — tabbed layout
// ═══════════════════════════════════════════════════════════════════════════════
type ConfigTab = 'speakers' | 'groups' | 'statuses' | 'programs';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'speakers', label: 'POC Owners / Speakers', icon: <Users size={15} /> },
  { id: 'groups',   label: 'Product Groups',         icon: <Layers size={15} /> },
  { id: 'statuses', label: 'Statuses',               icon: <Tag size={15} /> },
  { id: 'programs', label: 'Programs & Cohorts',     icon: <Layers size={15} /> },
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
        </div>
      </div>
    </div>
  );
};


