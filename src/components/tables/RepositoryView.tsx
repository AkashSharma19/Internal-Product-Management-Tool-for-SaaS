import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Trash2,
  Edit2,
  X,
  Search,
  Plus,
  Copy
} from 'lucide-react';


import { FolderOpen as FolderIcon, Check as CheckIcon, X as CancelIcon, Save as SaveIcon, GripVertical as GripIcon } from 'lucide-react';

const FaviconImage: React.FC<{ url: string }> = ({ url }) => {
  const [error, setError] = useState(false);
  if (error || !url) {
    return <span style={{ fontSize: '0.9rem', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>🔗</span>;
  }
  
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    return <span style={{ fontSize: '0.9rem', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>🔗</span>;
  }

  return (
    <img 
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
      onError={() => setError(true)}
      alt=""
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '3px',
        objectFit: 'contain',
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  );
};

export const RepositoryView: React.FC = () => {
  const {
    repoTabs = [], addRepoTab, updateRepoTab, deleteRepoTab,
    repoDocs = [], addRepoDoc, updateRepoDoc, deleteRepoDoc,
    isLoading, syncStatus,
    confirm, alert
  } = useDashboard();

  // Active states
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab management states
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  // Item form states (Add / Edit)
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // Copy success animation states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and drop states
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Local list states for smooth, high-fidelity drag-and-drop
  const [localTabs, setLocalTabs] = useState<any[]>([]);
  const [localLinks, setLocalLinks] = useState<any[]>([]);

  // Synchronize local states when underlying dashboard context values modify
  useEffect(() => {
    if (!draggedTabId) {
      setLocalTabs([...repoTabs].sort((a, b) => a.order - b.order));
    }
  }, [repoTabs, draggedTabId]);

  useEffect(() => {
    if (!draggedItemId) {
      const tabLinks = repoDocs
        .filter(d => d.tabId === activeTabId)
        .sort((a, b) => a.order - b.order);
      setLocalLinks(tabLinks);
    }
  }, [repoDocs, activeTabId, draggedItemId]);

  // Handle setting first tab as active on load
  useEffect(() => {
    if (repoTabs.length > 0 && !activeTabId) {
      const sorted = [...repoTabs].sort((a, b) => a.order - b.order);
      setActiveTabId(sorted[0].id);
    }
  }, [repoTabs, activeTabId]);

  // Tab Drag Handlers
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverTabId !== targetId) {
      setDragOverTabId(targetId);
    }
    if (!draggedTabId || draggedTabId === targetId) return;

    const dragIndex = localTabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = localTabs.findIndex(t => t.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localTabs];
    const [draggedTab] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedTab);
    
    setLocalTabs(newList);
  };

  const handleTabDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleTabDragEnd = () => {
    if (draggedTabId) {
      // Persist final order changes exactly once at drop
      localTabs.forEach((tab, index) => {
        if (tab.order !== index) {
          updateRepoTab(tab.id, { order: index });
        }
      });
      setDraggedTabId(null);
    }
    setDragOverTabId(null);
  };

  // Item Drag Handlers
  const handleItemDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverItemId !== targetId) {
      setDragOverItemId(targetId);
    }
    if (!draggedItemId || draggedItemId === targetId) return;

    const dragIndex = localLinks.findIndex(l => l.id === draggedItemId);
    const targetIndex = localLinks.findIndex(l => l.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localLinks];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    setLocalLinks(newList);
  };

  const handleItemDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleItemDragEnd = () => {
    if (draggedItemId) {
      // Persist final order changes exactly once at drop
      localLinks.forEach((link, index) => {
        if (link.order !== index) {
          updateRepoDoc(link.id, { order: index });
        }
      });
      setDraggedItemId(null);
    }
    setDragOverItemId(null);
  };


  // Add Repository Tab
  const handleCreateTab = () => {
    if (!newTabName.trim()) return;
    const cleanName = newTabName.trim();
    if (repoTabs.some(t => t.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("A tab with this name already exists.");
      return;
    }
    const newTab = {
      id: `repo-tab-${Date.now()}`,
      name: cleanName,
      order: repoTabs.length
    };
    addRepoTab(newTab);
    setActiveTabId(newTab.id);
    setNewTabName('');
    setIsAddingTab(false);
  };

  // Rename Repository Tab
  const handleSaveRenameTab = (tabId: string) => {
    if (!editingTabName.trim()) return;
    updateRepoTab(tabId, { name: editingTabName.trim() });
    setEditingTabId(null);
  };

  // Delete Repository Tab
  const handleDeleteTabClick = async (tab: any) => {
    if (await confirm(`Are you sure you want to delete tab "${tab.name}"? All links inside will be deleted permanently.`, "Delete Tab")) {
      deleteRepoTab(tab.id);
      setActiveTabId(null);
    }
  };

  // Add Link Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId) return;
    if (!itemTitle.trim() || !itemUrl.trim()) {
      alert("Please fill in both name and link fields.");
      return;
    }
    
    // Auto prefix link with https:// if no protocol is given
    let finalUrl = itemUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const docsInTab = repoDocs.filter(d => d.tabId === activeTabId);
    const newItem = {
      id: `repo-doc-${Date.now()}`,
      tabId: activeTabId,
      title: itemTitle.trim(),
      url: finalUrl,
      order: docsInTab.length,
      blocks: []
    };

    addRepoDoc(newItem);
    setItemTitle('');
    setItemUrl('');
    setIsAddingItem(false);
  };

  // Save Edit Item
  const handleSaveEditItem = (itemId: string) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      alert("Fields cannot be empty.");
      return;
    }

    let finalUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    updateRepoDoc(itemId, {
      title: editTitle.trim(),
      url: finalUrl
    });
    setEditingItemId(null);
  };

  // Trigger copy to clipboard
  const handleCopyToClipboard = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Delete Item
  const handleDeleteItem = async (doc: any) => {
    if (await confirm(`Are you sure you want to remove link "${doc.title}"?`, "Delete Link")) {
      deleteRepoDoc(doc.id);
    }
  };

  // Filter links from localLinks state
  const filteredLinks = localLinks.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.url || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="full-canvas-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* 1. TOP HEADER ROW */}
      <div className="sheet-toolbar" style={{ borderBottom: 'none' }}>
        <div className="toolbar-left" style={{ flex: 1, overflow: 'hidden', flexWrap: 'nowrap' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginRight: '1.5rem' }}>
            Repository
          </h2>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          {/* Search links */}
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search size={16} />
            <input 
              type="text"
              className="search-input"
              placeholder="Search item or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="search-clear-btn" 
                onClick={() => setSearchQuery('')}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Add item trigger */}
          <button
            onClick={() => {
              setIsAddingItem(true);
              setEditingItemId(null);
            }}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Plus size={14} /> Add Resource Link
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS ROW (Underline Style matching Product Breakdown) */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        padding: '0 1.5rem 0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--panel-bg)',
        alignItems: 'center'
      }}>
        {localTabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;
          return (
            <div 
              key={tab.id} 
              onClick={() => {
                setActiveTabId(tab.id);
                setIsAddingItem(false);
                setEditingItemId(null);
              }}
              onDoubleClick={() => {
                setEditingTabId(tab.id);
                setEditingTabName(tab.name);
              }}
              draggable={!isEditing}
              onDragStart={(e) => handleTabDragStart(e, tab.id)}
              onDragOver={(e) => handleTabDragOver(e, tab.id)}
              onDragLeave={handleTabDragLeave}
              onDragEnd={handleTabDragEnd}
              style={{ 
                padding: '0.5rem 0.5rem',
                borderBottom: tab.id === dragOverTabId 
                  ? '2px solid var(--primary)' 
                  : (isActive ? '2px solid var(--primary)' : '2px solid transparent'),
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isEditing ? 'default' : 'grab',
                transition: 'all 0.2s',
                outline: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none',
                backgroundColor: tab.id === dragOverTabId ? 'var(--primary-glow)' : 'transparent',
                borderRadius: tab.id === dragOverTabId ? '4px' : '0px',
                opacity: tab.id === draggedTabId ? 0.4 : 1
              }}
            >
              {isEditing ? (
                <input 
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => handleSaveRenameTab(tab.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameTab(tab.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: '2px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--background)', color: 'var(--text-primary)' }}
                  autoFocus
                />
              ) : (
                <>
                  {tab.name}
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTabClick(tab);
                    }}
                    style={{ fontSize: '0.75rem', opacity: isActive ? 0.6 : 0.2, cursor: 'pointer', marginLeft: '4px' }}
                    title="Delete Tab"
                  >
                    ×
                  </span>
                </>
              )}
            </div>
          );
        })}

        {/* Inline add tab trigger */}
        {isAddingTab ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input 
              type="text"
              placeholder="New Tab Name..."
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTab()}
              style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handleCreateTab} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Add</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAddingTab(false)} style={{ padding: '3px 6px', fontSize: '0.7rem' }}>×</button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingTab(true)}
            style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '6px', padding: '0.3rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <Plus size={12} /> Add Tab
          </button>
        )}
      </div>

      {/* 3. MAIN RESOURSE CANVAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, width: '100%', overflowY: 'auto' }}>
        {!activeTabId ? (
          isLoading || (syncStatus === 'syncing' && repoTabs.length === 0) || repoTabs.length > 0 ? (
            /* Loading state or waiting for activeTabId to initialize in useEffect */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
            </div>
          ) : (
            /* repoTabs is truly empty */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1rem', padding: '3rem' }}>
              <FolderIcon size={48} style={{ opacity: 0.4, color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Tab Selected</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create a tab above or select an existing one to manage link resources.</p>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Modal Popup Add Item */}
            {isAddingItem && (
              <div className="modal-overlay" onClick={() => setIsAddingItem(false)}>
                <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title">Add New Link Item</h3>
                    <button className="modal-close" onClick={() => setIsAddingItem(false)}>
                      <CancelIcon size={18} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource Title / Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. PRD for Payment Checkout"
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background-alt)', color: 'var(--text-primary)' }}
                          required
                          autoFocus
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. docs.google.com/... or https://..."
                          value={itemUrl}
                          onChange={(e) => setItemUrl(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background-alt)', color: 'var(--text-primary)' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsAddingItem(false);
                          setItemTitle('');
                          setItemUrl('');
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ background: 'linear-gradient(135deg, var(--primary), #a855f7)', border: 'none' }}
                      >
                        Add Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Links Content Canvas */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {filteredLinks.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--background-alt)', borderRadius: '8px', border: '1px dashed var(--border)', margin: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.825rem', fontStyle: 'italic' }}>
                    {searchQuery ? "No resource links matched your search." : "No resource links inside this tab yet. Click 'Add Resource Link' above to add one."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive" style={{ flex: 1, width: '100%', border: 'none', borderRadius: 0 }}>
                  <table className="grid-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', padding: '10px 1rem', cursor: 'default' }}></th>
                        <th style={{ padding: '0.7rem 1rem', width: '40%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em' }}>Resource Name</th>
                        <th style={{ padding: '0.7rem 1rem', width: '40%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em' }}>URL Link</th>
                        <th style={{ padding: '0.7rem 1rem', width: '20%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLinks.map((item) => {
                        const isEditing = item.id === editingItemId;
                        const isCopied = item.id === copiedId;
                        return (
                          <tr 
                            key={item.id} 
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragOver={(e) => handleItemDragOver(e, item.id)}
                            onDragLeave={handleItemDragLeave}
                            onDragEnd={handleItemDragEnd}
                            style={{ 
                              opacity: item.id === draggedItemId ? 0.4 : 1,
                              background: item.id === draggedItemId 
                                ? 'var(--background-alt)' 
                                : (item.id === dragOverItemId ? 'var(--primary-glow)' : 'transparent'),
                              borderBottom: item.id === dragOverItemId ? '2px solid var(--primary)' : '1px solid var(--border)',
                              transition: 'background-color 0.15s, border-bottom 0.15s',
                              cursor: 'grab'
                            }}
                          >
                            
                            {/* Grip Drag Handle Icon Column */}
                            <td style={{ width: '40px', padding: '10px 1rem', textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>
                              <GripIcon size={13} style={{ cursor: 'grab', opacity: 0.5 }} />
                            </td>

                            {/* Title/Name Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '40%', fontWeight: 600, whiteSpace: 'normal' }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editTitle}
                                  onChange={(e) => editTitle !== e.target.value && setEditTitle(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '6px 8px', 
                                    fontSize: '0.8rem', 
                                    borderRadius: '6px', 
                                    border: '1.5px solid var(--primary)', 
                                    background: 'var(--background)', 
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                  }}
                                  required
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: '1.3' }}>
                                  <FaviconImage url={item.url} />
                                  <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ 
                                      color: 'var(--text-primary)', 
                                      textDecoration: 'none', 
                                      fontWeight: 600, 
                                      borderBottom: '1px dashed transparent',
                                      transition: 'all 0.2s',
                                    }}
                                    className="repo-link-anchor"
                                  >
                                    {item.title}
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* URL/Link Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '40%', whiteSpace: 'nowrap' }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editUrl}
                                  onChange={(e) => editUrl !== e.target.value && setEditUrl(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '6px 8px', 
                                    fontSize: '0.8rem', 
                                    borderRadius: '6px', 
                                    border: '1.5px solid var(--primary)', 
                                    background: 'var(--background)', 
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                  }}
                                  required
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '380px' }}>
                                  <span style={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap', 
                                    color: 'var(--text-muted)',
                                    fontSize: '0.78rem'
                                  }}>
                                    {item.url}
                                  </span>
                                  
                                  {/* Copy link button (no alerts) */}
                                  <button
                                    onClick={() => handleCopyToClipboard(item.id, item.url || '')}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: isCopied ? '#10b981' : 'var(--text-muted)',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      transition: 'color 0.2s'
                                    }}
                                    title="Copy Link to Clipboard"
                                  >
                                    {isCopied ? <CheckIcon size={12} /> : <Copy size={12} />}
                                    {isCopied && <span style={{ fontSize: '0.65rem', fontWeight: 600, marginLeft: '4px' }}>Copied!</span>}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '20%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                {isEditing ? (
                                  <>
                                    <button 
                                      onClick={() => handleSaveEditItem(item.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      title="Save Link"
                                    >
                                      <SaveIcon size={13} />
                                    </button>
                                    <button 
                                      onClick={() => setEditingItemId(null)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      title="Cancel"
                                    >
                                      <CancelIcon size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditTitle(item.title);
                                        setEditUrl(item.url || '');
                                        setIsAddingItem(false);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                      title="Edit Link Details"
                                    >
                                      <Edit2 size={12} />
                                    </button>

                                    <button 
                                      onClick={() => handleDeleteItem(item)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                                      title="Delete Link"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

