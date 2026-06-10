import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ConfigSpeaker, ConfigProductGroup, ConfigStatus } from '../types';
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — tabbed layout
// ═══════════════════════════════════════════════════════════════════════════════
type ConfigTab = 'speakers' | 'groups' | 'statuses';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'speakers', label: 'POC Owners / Speakers', icon: <Users size={15} /> },
  { id: 'groups',   label: 'Product Groups',         icon: <Layers size={15} /> },
  { id: 'statuses', label: 'Statuses',               icon: <Tag size={15} /> },
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
        padding: '1.25rem 2rem 0',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: '11px',
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            flexShrink: 0,
          }}>
            <Settings size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Configuration
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Manage master lists used across all dropdowns in the dashboard
            </p>
          </div>
        </div>

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
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>

        {/* Info banner */}
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.65rem 1rem',
          borderRadius: '10px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: '0.95rem' }}>💡</span>
          Changes are reflected immediately in all dropdowns and persist to local storage.
        </div>

        {/* Active section */}
        <div style={{ maxWidth: 860 }}>
          {activeTab === 'speakers'  && <SpeakersSection />}
          {activeTab === 'groups'    && <ProductGroupsSection />}
          {activeTab === 'statuses'  && <StatusesSection />}
        </div>
      </div>
    </div>
  );
};

