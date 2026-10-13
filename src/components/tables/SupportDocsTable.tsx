import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Edit2,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Star,
  Plus,
  Copy,
  FileText
} from 'lucide-react';
import type {
  ProductItem,
  SupportDocItem
} from '../../types';
import {
  getSupportDocs,
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  parseDateToYYYYMMDD,
  formatDateToUserPattern,
  getDateSpanStyle
} from '../common/tableUtils';

interface ManageSupportDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProductItem | null;
  onSave: (docs: SupportDocItem[]) => Promise<void> | void;
  canEdit: boolean;
}

export const ManageSupportDocsModal: React.FC<ManageSupportDocsModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  canEdit
}) => {
  const [docs, setDocs] = useState<SupportDocItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newLink, setNewLink] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLink, setEditLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setDocs(getSupportDocs(task));
      setNewName('');
      setNewLink('');
      setEditingId(null);
    }
  }, [isOpen, task]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const handleAddDoc = () => {
    const trimmedLink = newLink.trim();
    if (!trimmedLink) return;
    const trimmedName = newName.trim() || 'Document';
    const newDoc: SupportDocItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      link: trimmedLink
    };
    setDocs(prev => [...prev, newDoc]);
    setNewName('');
    setNewLink('');
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleStartEdit = (doc: SupportDocItem) => {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditLink(doc.link);
  };

  const handleSaveEdit = (id: string) => {
    if (!editLink.trim()) return;
    setDocs(prev => prev.map(d => d.id === id ? {
      ...d,
      name: editName.trim() || 'Document',
      link: editLink.trim()
    } : d));
    setEditingId(null);
  };

  const handleCopy = (id: string, link: string) => {
    const fullLink = link.startsWith('http') ? link : `https://${link}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 2000);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(docs);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem',
          gap: '1.25rem',
          animation: 'fadeIn 0.2s ease',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Support Documentation
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Feature: <strong style={{ color: 'var(--text-primary)' }}>{task.feature}</strong>
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Docs List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Attached Documents ({docs.length})
          </span>

          {docs.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--background)', borderRadius: '10px', border: '1px dashed var(--border-light)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No support documents added yet. Add one below with a name and URL link.
              </p>
            </div>
          ) : (
            docs.map((doc, idx) => {
              const isEditing = editingId === doc.id;
              return (
                <div 
                  key={doc.id}
                  style={{
                    display: 'flex',
                    flexDirection: isEditing ? 'column' : 'row',
                    alignItems: isEditing ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Document Name"
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                        <input
                          type="text"
                          value={editLink}
                          onChange={e => setEditLink(e.target.value)}
                          placeholder="https://..."
                          style={{ flex: 2, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(doc.id)}
                          style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, width: '18px' }}>
                          #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.name || 'Document'}
                          </span>
                          <a
                            href={doc.link.startsWith('http') ? doc.link : `https://${doc.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title={doc.link}
                          >
                            <span>{doc.link}</span>
                            <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.8 }} />
                          </a>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleCopy(doc.id, doc.link)}
                          style={{
                            background: copiedId === doc.id ? 'rgba(16, 185, 129, 0.15)' : 'none',
                            border: copiedId === doc.id ? '1px solid #10b981' : 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: copiedId === doc.id ? '#10b981' : 'var(--text-muted)',
                            padding: '4px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.7rem',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy Link"
                        >
                          {copiedId === doc.id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedId === doc.id && <span>Copied</span>}
                        </button>

                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(doc)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}
                              title="Edit document"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '4px' }}
                              title="Delete document"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add New Document Form */}
        {canEdit && (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              + Add Document
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Doc Name (e.g. User Guide, API Reference)"
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <input
                type="text"
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDoc();
                  }
                }}
                placeholder="Document URL (https://...)"
                style={{ flex: 2, padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <button
                type="button"
                onClick={handleAddDoc}
                disabled={!newLink.trim()}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  cursor: newLink.trim() ? 'pointer' : 'not-allowed',
                  opacity: newLink.trim() ? 1 : 0.6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              style={{
                padding: '6px 20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSaving ? 'Saving...' : 'Save & Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 15. SUPPORT DOCS TABLE
// ==========================================
export const SupportDocsTable: React.FC = () => {
  const { 
    updateProductItem, 
    setPreviewProductId,
    previewProductId,
    productItems,
    canUserEdit,
    fetchSupportDocsData
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState<'all' | 'has-link' | 'missing-link'>('all');

  // Sorting
  const [sortField, setSortField] = useState<keyof ProductItem | null>('finalRelease');
  const [sortAsc, setSortAsc] = useState(true);

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Manage Docs Modal
  const [modalTask, setModalTask] = useState<ProductItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenManageDocsModal = (e: React.MouseEvent, item: ProductItem) => {
    e.stopPropagation();
    setModalTask(item);
    setIsModalOpen(true);
  };

  const handleSaveDocs = async (updatedDocs: SupportDocItem[]) => {
    if (!modalTask) return;
    const firstLink = updatedDocs[0]?.link || '';
    setItems(prev => prev.map(item => item.id === modalTask.id ? { 
      ...item, 
      supportDocs: updatedDocs,
      supportDocLink: firstLink 
    } : item));
    await updateProductItem(modalTask.id, { 
      supportDocs: updatedDocs,
      supportDocLink: firstLink 
    });
  };

  // Server-side paginated state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequired, setTotalRequired] = useState(0);
  const [totalWithDocs, setTotalWithDocs] = useState(0);
  const [totalMissing, setTotalMissing] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const handleCopyLink = (e: React.MouseEvent, id: string, link: string) => {
    e.stopPropagation();
    const fullLink = link.startsWith('http') ? link : `https://${link}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedLinkId(id);
    setTimeout(() => {
      setCopiedLinkId(prev => prev === id ? null : prev);
    }, 2000);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDocStatus, pageSize]);

  const loadData = useCallback(async () => {
    setIsFetching(true);
    const res = await fetchSupportDocsData({
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      docStatus: filterDocStatus,
      sortField: sortField || 'finalRelease',
      sortAsc: sortAsc
    });
    if (res && res.success) {
      setItems(res.data || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
      setTotalRequired(res.totalRequired || 0);
      setTotalWithDocs(res.totalWithDocs || 0);
      setTotalMissing(res.totalMissing || 0);
    }
    setIsFetching(false);
  }, [fetchSupportDocsData, currentPage, pageSize, searchQuery, filterDocStatus, sortField, sortAsc]);

  useEffect(() => {
    loadData();
  }, [loadData, productItems.length, previewProductId]);

  const handleSort = (field: keyof ProductItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = useMemo(() => {
    const list = [...items];
    const isCompletedStatusHelper = (status?: string) => {
      if (!status) return false;
      const s = status.toLowerCase().trim().replace(/\s*\(\d+\)$/, '').trim();
      return ['delivered', 'completed', 'done', 'closed', 'tested', 'released', 'complete', 'resolved'].includes(s);
    };

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const getItemTier = (item: ProductItem) => {
      const hasDoc = getSupportDocs(item).length > 0;
      const isDone = !!item.finalReleaseCompleted || isCompletedStatusHelper(item.status) || isCompletedStatusHelper(item.clickupStatus);
      const dateStr = parseDateToYYYYMMDD(item.finalRelease || '');

      // If no release date, goes to bottom tier
      if (!dateStr) {
        return { tier: 5, dateStr: '', hasDoc, isDone };
      }

      const isPast = dateStr < todayStr;

      // Tier 1: Overdue unreleased tasks (deadline passed, not completed)
      if (isPast && !isDone) {
        return { tier: 1, dateStr, hasDoc, isDone };
      }

      // Tier 2: Overdue documentation (release date passed, support doc missing)
      if (isPast && !hasDoc) {
        return { tier: 2, dateStr, hasDoc, isDone };
      }

      // Tier 3: Upcoming with missing docs (releasing soon, needs docs)
      if (!isPast && !hasDoc) {
        return { tier: 3, dateStr, hasDoc, isDone };
      }

      // Tier 4: Has doc added already
      if (hasDoc) {
        return { tier: 4, dateStr, hasDoc, isDone };
      }

      return { tier: 5, dateStr, hasDoc, isDone };
    };

    if (sortField === 'finalRelease') {
      list.sort((a, b) => {
        const metaA = getItemTier(a);
        const metaB = getItemTier(b);

        if (metaA.tier !== metaB.tier) {
          return metaA.tier - metaB.tier;
        }

        if (metaA.tier === 5) {
          return String(a.feature || '').localeCompare(String(b.feature || ''));
        }

        const cmp = metaA.dateStr.localeCompare(metaB.dateStr);
        if (cmp !== 0) {
          return sortAsc ? cmp : -cmp;
        }

        return String(a.feature || '').localeCompare(String(b.feature || ''));
      });
    } else if (sortField) {
      list.sort((a, b) => {
        const hasLinkA = getSupportDocs(a).length > 0;
        const hasLinkB = getSupportDocs(b).length > 0;
        if (hasLinkA !== hasLinkB) {
          return hasLinkA ? 1 : -1;
        }
        const valA = String(a[sortField] || '').toLowerCase();
        const valB = String(b[sortField] || '').toLowerCase();
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return list;
  }, [items, sortField, sortAsc]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <>
      <TabContainer
        title="Support Docs"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={() => setFilterDocStatus('all')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                border: filterDocStatus === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: filterDocStatus === 'all' ? 'var(--primary-glow)' : 'var(--panel-bg)',
                color: filterDocStatus === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              All ({totalRequired})
            </button>
            <button
              onClick={() => setFilterDocStatus('has-link')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                border: filterDocStatus === 'has-link' ? '1.5px solid #10b981' : '1px solid var(--border)',
                background: filterDocStatus === 'has-link' ? 'rgba(16, 185, 129, 0.15)' : 'var(--panel-bg)',
                color: filterDocStatus === 'has-link' ? '#10b981' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              Doc Added ({totalWithDocs})
            </button>
            <button
              onClick={() => setFilterDocStatus('missing-link')}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                border: filterDocStatus === 'missing-link' ? '1.5px solid #ef4444' : '1px solid var(--border)',
                background: filterDocStatus === 'missing-link' ? 'rgba(239, 68, 68, 0.15)' : 'var(--panel-bg)',
                color: filterDocStatus === 'missing-link' ? '#ef4444' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              Missing Link ({totalMissing})
            </button>
          </div>
        }
      >
        {!isFetching && totalRequired === 0 ? (
          <div style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--panel-bg)',
            border: '1px dashed var(--border-light)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            margin: '1rem 0'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={26} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                No Tasks Require Support Docs Yet
              </h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: '1.5' }}>
                To track support documentation for a task, open any task's detail view in <strong>Product Breakdown</strong> or <strong>Priority Requests</strong>, and toggle <strong>"Required Support Docs"</strong> to ON.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '340px', minWidth: '340px', maxWidth: '380px', cursor: 'pointer' }}>
                      Feature / Task {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('poc')} style={{ width: '150px', cursor: 'pointer' }}>
                      Assignee {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ width: '220px' }}>Support Documentation</th>
                    <th onClick={() => handleSort('clickupStatus')} style={{ width: '140px', cursor: 'pointer' }}>
                      ClickUp Status {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('finalRelease')} style={{ width: '130px', cursor: 'pointer' }}>
                      Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('notificationSent')} style={{ width: '150px', cursor: 'pointer', textAlign: 'center' }}>
                      Notification Sent {sortField === 'notificationSent' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                        {/* Feature / Task Name */}
                        <td className="sticky-col" style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '14px', width: '85%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.4, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          <div className="skeleton-line" style={{ height: '10px', width: '45%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* Created By */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '22px', width: '110px', borderRadius: '6px', background: 'var(--border)', opacity: 0.35, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* Assignee */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '18px', width: '90px', borderRadius: '12px', background: 'var(--border)', opacity: 0.4, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* Support Doc */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '22px', width: '130px', borderRadius: '6px', background: 'var(--border)', opacity: 0.35, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* ClickUp Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '18px', width: '75px', borderRadius: '12px', background: 'var(--border)', opacity: 0.35, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* Release Date */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                        {/* Notification Sent */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div className="skeleton-line" style={{ height: '18px', width: '60px', margin: '0 auto', borderRadius: '12px', background: 'var(--border)', opacity: 0.35, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </td>
                      </tr>
                    ))
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No support documentation tasks found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => {
                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setPreviewProductId(item.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Feature / Task Name & Product Group */}
                          <td className="sticky-col" style={{ fontWeight: 600, width: '360px', minWidth: '360px', maxWidth: '400px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem', width: '100%' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.35' }}>
                              {item.feature}
                            </span>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {item.product && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  background: 'var(--panel-bg)',
                                  border: '1px solid var(--border)',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {item.product}
                                </span>
                              )}
                              {item.priority && (
                                <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px' }}>
                                  {item.priority}
                                </span>
                              )}
                              {item.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Star size={9} fill="currentColor" /> Super Priority
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Assignee (Portal POC & ClickUp Assignee) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            {item.poc ? (
                              <span style={getPOCBadgeStyle(item.poc)}>
                                {item.poc}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                            {item.clickupAssignee && (
                              <div className="cu-tooltip-container">
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                  CU: {formatClickupAssignee(item.clickupAssignee)}
                                </span>
                                <span className="cu-tooltip-text">
                                  {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Support Doc Link */}
                        <td onClick={(e) => e.stopPropagation()} style={{ minWidth: '220px', maxWidth: '320px' }}>
                          {(() => {
                            const docs = getSupportDocs(item);
                            if (docs.length === 0) {
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    fontSize: '0.725rem',
                                    fontWeight: 650
                                  }}>
                                    <AlertCircle size={11} /> Missing Link
                                  </span>
                                  {canUserEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenManageDocsModal(e, item)}
                                      style={{
                                        background: 'none',
                                        border: '1px dashed var(--border)',
                                        borderRadius: '6px',
                                        padding: '2px 7px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Add support document"
                                    >
                                      <Plus size={11} /> Add Doc
                                    </button>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                {docs.slice(0, 2).map((doc) => (
                                  <div key={doc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <a
                                      href={doc.link.startsWith('http') ? doc.link : `https://${doc.link}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 7px',
                                        borderRadius: '6px',
                                        background: 'var(--primary-glow)',
                                        color: 'var(--primary)',
                                        border: '1px solid var(--primary-border)',
                                        fontSize: '0.725rem',
                                        fontWeight: 650,
                                        textDecoration: 'none',
                                        maxWidth: '135px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title={`${doc.name}: ${doc.link}`}
                                    >
                                      <FileText size={11} style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {doc.name || 'Document'}
                                      </span>
                                      <ExternalLink size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyLink(e, doc.id, doc.link)}
                                      style={{
                                        background: copiedLinkId === doc.id ? 'rgba(16, 185, 129, 0.15)' : 'none',
                                        border: copiedLinkId === doc.id ? '1px solid #10b981' : 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: copiedLinkId === doc.id ? '#10b981' : 'var(--text-muted)',
                                        padding: '2px 4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        transition: 'all 0.15s ease'
                                      }}
                                      title={copiedLinkId === doc.id ? "Copied!" : `Copy link for ${doc.name}`}
                                    >
                                      {copiedLinkId === doc.id ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                ))}

                                {docs.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenManageDocsModal(e, item)}
                                    style={{
                                      background: 'var(--background-alt, var(--panel-bg))',
                                      border: '1px solid var(--border)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '0.675rem',
                                      fontWeight: 700,
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer'
                                    }}
                                    title="View all documents"
                                  >
                                    +{docs.length - 2} more
                                  </button>
                                )}

                                {canUserEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenManageDocsModal(e, item)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      padding: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      marginLeft: '1px'
                                    }}
                                    title="Manage all documents"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* ClickUp Status */}
                        <td>
                          {item.clickupStatus ? (
                            <span style={getClickupBadgeStyle(item.clickupStatus)}>
                              {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Release Date */}
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.finalRelease ? (
                            <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                              {formatDateToUserPattern(item.finalRelease)}
                            </span>
                          ) : item.finalReleaseCompleted ? (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontWeight: 700
                            }}>
                              Done
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Notification Sent Toggle */}
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle', width: '150px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <label 
                              className="premium-toggle-wrapper" 
                              style={{ margin: 0, cursor: canUserEdit ? 'pointer' : 'not-allowed' }} 
                              title={item.notificationSent ? "Release notification email sent to team" : "Release notification email not yet sent"}
                            >
                              <input 
                                type="checkbox" 
                                className="premium-toggle-checkbox" 
                                checked={!!item.notificationSent} 
                                disabled={!canUserEdit}
                                onChange={async (e) => {
                                  const newVal = e.target.checked;
                                  setItems(prev => prev.map(p => p.id === item.id ? { ...p, notificationSent: newVal } : p));
                                  await updateProductItem(item.id, { notificationSent: newVal });
                                }} 
                              />
                              <span className="premium-toggle-slider" />
                            </label>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 650,
                              color: item.notificationSent ? '#10b981' : 'var(--text-muted)',
                              minWidth: '46px',
                              textAlign: 'left'
                            }}>
                              {item.notificationSent ? 'Sent' : 'Pending'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            {/* Product Breakdown Style Pagination Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.5rem',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--panel-bg)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              {/* Left: Info */}
              <div>
                Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> features
              </div>

              {/* Right: Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {/* Page Size Select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '4px 24px 4px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={activePage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: activePage === 1 ? 0.5 : 1,
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: activePage === 1 ? 0.5 : 1,
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    title="Previous Page"
                  >
                    ‹
                  </button>
                  
                  <span style={{ fontSize: '0.75rem', padding: '0 0.5rem', fontWeight: 650 }}>
                    Page {activePage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: activePage === totalPages ? 0.5 : 1,
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    title="Next Page"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={activePage === totalPages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: activePage === totalPages ? 0.5 : 1,
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </TabContainer>

      <ManageSupportDocsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalTask(null);
        }}
        task={modalTask}
        onSave={handleSaveDocs}
        canEdit={canUserEdit}
      />
    </>
  );
};
