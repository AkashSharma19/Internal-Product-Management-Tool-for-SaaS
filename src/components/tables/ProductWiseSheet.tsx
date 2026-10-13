import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Trash2,
  X,
  Star,
  CheckCircle,
  Search,
  Plus,
  MessageSquare
} from 'lucide-react';
import type {
  ProductItem
} from '../../types';
import {
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToUserPattern,
  getDateSpanStyle
} from '../common/tableUtils';
import {
  DateDiffBadge,
  MultiSelectDropdown
} from '../common/TableShared';

export const ProductWiseSheet: React.FC = () => {
  const {
    productItems,
    studentProjects,
    contentItems,
    studentMeetings,
    dailyIssues,
    addProductItem,
    updateProductItem,
    deleteProductItem,
    setPreviewProductId,
    openPreviewForFeature,
    productGroups,
    statuses,
    speakers,
    currentUser,
    confirm,
    alert,
    comments,
    lastOpenedMap,
    fetchProductBreakdownData
  } = useDashboard();
  const products = productGroups.map(g => g.name);
  const NO_GROUP_TAB = 'No Product Group Assigned';
  const allTabs = [...products, NO_GROUP_TAB];
  const pocList = speakers.map(s => s.name);
  const [productCounts, setProductCounts] = useState<Record<string, { total: number; completed: number }>>({});

  const getProductFeatureCount = (prodName: string) => {
    const val = productCounts[prodName];
    if (!val) return '0/0';
    return `${val.completed}/${val.total}`;
  };

  const [activeProductTab, setActiveProductTab] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedFeatures, setPaginatedFeatures] = useState<BreakdownFeature[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const openPreviewRef = useRef(openPreviewForFeature);
  openPreviewRef.current = openPreviewForFeature;
  const setPreviewProductIdRef = useRef(setPreviewProductId);
  setPreviewProductIdRef.current = setPreviewProductId;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeProductTab, searchQuery, filterSuperPriorityOnly, filterStatuses, filterPocs]);

  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];

  type BreakdownFeature = ProductItem & {
    sourceLabel: string;
    sourceId: string;
    openPreview: () => void;
    canDelete: boolean;
  };

  // Sorting state
  const [sortField, setSortField] = useState<keyof BreakdownFeature | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: keyof BreakdownFeature) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  useEffect(() => {
    if (editingFeatureId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFeatureId]);
  
  const isNoGroupTab = activeProductTab === NO_GROUP_TAB;
  const activeProduct = activeProductTab === NO_GROUP_TAB
    ? NO_GROUP_TAB
    : (activeProductTab && products.includes(activeProductTab) ? activeProductTab : products[0] || '');

  const fetchFeatures = useCallback(async () => {
    if (!activeProduct) return;
    setIsFetchingData(true);
    const res = await fetchProductBreakdownData({
      product: activeProduct,
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      superPriority: filterSuperPriorityOnly,
      statuses: filterStatuses,
      pocs: filterPocs,
      sortField: sortField || undefined,
      sortAsc: sortAsc
    });
    if (res && res.success) {
      const mapped = (res.data || []).map((item: any) => {
        let openPreview = () => {};
        if (item.sourceLabel === 'Feedback') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Product Breakdown') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Priority Requests') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Student Projects') {
          openPreview = () => openPreviewRef.current(item.feature, item);
        } else if (item.sourceLabel === 'Content Pipeline') {
          openPreview = () => openPreviewRef.current(item.feature, {
            description: item.description,
            status: item.status,
            clickupStatus: item.clickupStatus,
            priority: item.priority,
            poc: item.poc,
            product: item.product,
            productDeadline: item.productDeadline,
            uiux: item.uiux,
            deadline: item.deadline,
            finalRelease: item.finalRelease,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        } else if (item.sourceLabel === 'Student Meetings') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, item);
        } else if (item.sourceLabel === 'Daily Issues') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, {
            description: item.description,
            product: item.product,
            module: item.module,
            notes: item.notes,
            clickupStatus: item.clickupStatus,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        } else if (item.sourceLabel === 'Feature Request') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, {
            description: item.description,
            product: item.product,
            module: item.module,
            notes: item.notes,
            clickupStatus: item.clickupStatus,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        }

        return {
          ...item,
          openPreview
        };
      });

      setPaginatedFeatures(mapped);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
      if (res.productCounts) {
        setProductCounts(res.productCounts);
      }
    } else {
      setPaginatedFeatures([]);
      setTotalItems(0);
      setTotalPages(1);
    }
    setIsFetchingData(false);
  }, [
    activeProduct,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPocs,
    sortField,
    sortAsc,
    fetchProductBreakdownData
  ]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures, productItems, studentProjects, contentItems, studentMeetings, dailyIssues]);

  const handleAddNewFeature = async () => {
    if (!activeProduct || isNoGroupTab) {
      await alert(
        isNoGroupTab ? "Cannot add a feature without a product group. Please switch to a product tab." : "Please select a product category tab first.",
        "Unable to Add Feature",
        "OK",
        "warning"
      );
      return;
    }
    
    setSearchQuery('');

    const newItem: ProductItem = {
      id: `prod-breakdown-${Date.now()}`,
      feature: 'New Feature Request',
      description: '',
      tarunSirApproval: false,
      raisedByTarunSir: false,
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      product: activeProduct,
      uiux: '',
      finalRelease: '',
      productDeadline: '',
      createdAt: new Date().toISOString()
    };
    
    addProductItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div className="full-canvas-workspace">
      {products.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No products configured. Please add products in the Configuration tab.
        </div>
      ) : (
        <>
          {/* Top Tabs & Search Toolbar */}
          <div className="sheet-toolbar" style={{ borderBottom: allTabs.length > 2 ? 'none' : '1px solid var(--border)' }}>
            <div className="toolbar-left" style={{ flex: 1, overflow: 'hidden', flexWrap: 'nowrap' }}>
              <h2 style={{ fontSize: '1.25rem', marginRight: '1.5rem', whiteSpace: 'nowrap' }}>Product Breakdown</h2>
              
              {/* Product Tabs inline in toolbar-left (only when <= 2 products) */}
              {allTabs.length <= 2 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1.25rem',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  flex: 1,
                  alignSelf: 'stretch',
                  alignItems: 'center',
                  paddingTop: '2px'
                }}>
                  {allTabs.map((prod) => {
                    const isActive = prod === activeProduct;
                    const isSpecial = prod === NO_GROUP_TAB;
                    return (
                      <button
                        key={prod}
                        onClick={() => setActiveProductTab(prod)}
                        style={{
                          padding: '0.5rem 0.25rem',
                          border: 'none',
                          background: 'none',
                          borderBottom: isActive ? `2px solid ${isSpecial ? 'var(--warning)' : 'var(--primary)'}` : '2px solid transparent',
                          color: isActive ? (isSpecial ? 'var(--warning)' : 'var(--text-primary)') : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          height: '100%',
                          transform: 'translateY(1px)'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {prod}
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            backgroundColor: isActive 
                              ? (isSpecial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(124, 58, 237, 0.12)') 
                              : 'var(--bg-hover)',
                            color: isActive 
                              ? (isSpecial ? 'var(--warning)' : 'var(--primary)') 
                              : 'var(--text-secondary)',
                            border: isActive
                              ? `1px solid ${isSpecial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`
                              : '1px solid var(--border)',
                            fontWeight: 600
                          }}>
                            {getProductFeatureCount(prod)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="toolbar-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
              <MultiSelectDropdown
                options={statusOptions}
                selectedValues={filterStatuses}
                onChange={setFilterStatuses}
                placeholder="Status"
              />
              <MultiSelectDropdown
                options={[...pocList, 'No POC']}
                selectedValues={filterPocs}
                onChange={setFilterPocs}
                placeholder="POC"
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox"
                  checked={filterSuperPriorityOnly} 
                  onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                Super Priority Only
              </label>
              <div className="search-input-wrapper" style={{ position: 'relative' }}>
                <Search size={16} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search features..." 
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
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddNewFeature}
                disabled={isNoGroupTab}
                title={isNoGroupTab ? 'Switch to a product tab to add features' : undefined}
                style={{ whiteSpace: 'nowrap', flexShrink: 0, opacity: isNoGroupTab ? 0.45 : 1, cursor: isNoGroupTab ? 'not-allowed' : 'pointer' }}
              >
                <Plus size={14} /> Add Feature
              </button>
            </div>
          </div>

          {/* Product Tabs on next line if > 2 products */}
          {allTabs.length > 2 && (
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
              {allTabs.map((prod) => {
                const isActive = prod === activeProduct;
                const isSpecial = prod === NO_GROUP_TAB;
                return (
                  <button
                    key={prod}
                    onClick={() => setActiveProductTab(prod)}
                    style={{
                      padding: '0.5rem 0.25rem',
                      border: 'none',
                      background: 'none',
                      borderBottom: isActive ? `2px solid ${isSpecial ? 'var(--warning)' : 'var(--primary)'}` : '2px solid transparent',
                      color: isActive ? (isSpecial ? 'var(--warning)' : 'var(--text-primary)') : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {prod}
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 5px',
                        borderRadius: '8px',
                        backgroundColor: isActive 
                          ? (isSpecial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(124, 58, 237, 0.12)') 
                          : 'var(--bg-hover)',
                        color: isActive 
                          ? (isSpecial ? 'var(--warning)' : 'var(--primary)') 
                          : 'var(--text-secondary)',
                        border: isActive
                          ? `1px solid ${isSpecial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`
                          : '1px solid var(--border)',
                        fontWeight: 600
                      }}>
                        {getProductFeatureCount(prod)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Product Details Content - Full Canvas Table */}
          {activeProduct && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
              <div className="table-responsive" style={{ flex: 1, width: '100%', border: 'none', borderRadius: 0 }}>
                {(paginatedFeatures.length > 0 || isFetchingData) ? (
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '320px', minWidth: '320px', maxWidth: '320px', cursor: 'pointer' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                        Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetchingData ? (
                      Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                        <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                          <td className="sticky-col" style={{ width: '320px', minWidth: '320px', maxWidth: '320px', padding: '12px 16px' }}>
                            <div className="skeleton-line" style={{ height: '14px', width: '80%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                            <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          </td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '70px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td></td>
                        </tr>
                      ))
                    ) : paginatedFeatures.map(item => (
                      <tr key={item.id} className={item.blocker ? 'row-blocked' : ''} onClick={() => {
                        if (editingFeatureId !== item.id) {
                          item.openPreview();
                        }
                      }} style={{ cursor: 'pointer' }}>
                        <td className="sticky-col" style={{ fontWeight: 600, width: '320px', minWidth: '320px', maxWidth: '320px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                            {/* Source above feature name */}
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                              {item.sourceLabel}
                            </span>
                            {editingFeatureId === item.id ?
                              <input
                                ref={editInputRef}
                                type="text"
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineEditValue.trim() || 'New Feature Request';
                                    updateProductItem(item.sourceId, { feature: finalVal });
                                    setEditingFeatureId(null);
                                    if (e.ctrlKey) {
                                      item.openPreview();
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingFeatureId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineEditValue.trim() || 'New Feature Request';
                                  updateProductItem(item.sourceId, { feature: finalVal });
                                  setEditingFeatureId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                }}
                              />
                            : (() => {
                              const baseId = item.sourceId || item.id;
                              const itemComments = comments.filter((c: any) => c.itemId === baseId);
                              const lastOpened = lastOpenedMap[baseId];
                              const unreadCount = itemComments.filter((c: any) => {
                                if (!lastOpened) return true;
                                return new Date(c.createdAt).getTime() > lastOpened;
                              }).length;

                              return (
                                <span 
                                  onDoubleClick={(e) => {
                                    if (item.canDelete) {
                                      e.stopPropagation();
                                      setEditingFeatureId(item.id);
                                      setInlineEditValue(item.feature || '');
                                    }
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', lineHeight: '1.3' }}
                                >
                                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                                  </span>
                                  {unreadCount > 0 && (
                                    <span 
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: 'var(--danger, #ef4444)',
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        padding: '1.5px 5px',
                                        borderRadius: '6px',
                                        lineHeight: 1,
                                        flexShrink: 0
                                      }}
                                      title={`${unreadCount} unread comments`}
                                    >
                                      <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                      {unreadCount}
                                    </span>
                                  )}
                                </span>
                              );
                            })()
                            }
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              {item.priority && (
                                <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                  {item.priority}
                                </span>
                              )}
                              {item.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Star size={10} fill="currentColor" /> Super Priority
                                </span>
                              )}
                              {item.tarunSirApproval && (
                                <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                                  <CheckCircle size={10} /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            {item.poc ? (
                                <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                                    {item.poc}
                                </span>
                            ) : '—'}
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
                        <td>
                          {item.status ? (() => {
                            const matched = statuses.find(s => s.label === item.status);
                            if (matched) {
                              return (
                                <span className="badge" style={{
                                  backgroundColor: `${matched.color}14`,
                                  color: matched.color,
                                  borderColor: `${matched.color}33`,
                                  borderStyle: 'solid',
                                  borderWidth: '1px'
                                }}>
                                  {item.status}
                                </span>
                              );
                            }
                            return (
                              <span className={`badge ${
                                item.status === 'On Hold' ? 'status-hold' :
                                item.status === 'In Progress' ? 'status-progress' :
                                item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                              }`}>
                                {item.status}
                              </span>
                            );
                          })() : '—'}
                        </td>
                        <td>
                          {item.clickupStatus ? (
                            <span style={getClickupBadgeStyle(item.clickupStatus)}>
                              {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.createdAt} currentDate={item.productDeadline} />
                          {item.productDeadline ? (
                            <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                              {formatDateToUserPattern(item.productDeadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />
                          {item.uiux ? (
                            <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                              {formatDateToUserPattern(item.uiux)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />
                          {item.deadline ? (
                            <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                              {formatDateToUserPattern(item.deadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />
                          {item.finalRelease ? (
                            <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                              {formatDateToUserPattern(item.finalRelease)}
                            </span>
                          ) : item.finalReleaseCompleted ? (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              Delivered
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {item.canDelete && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                                  deleteProductItem(item.sourceId);
                                }
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {isNoGroupTab
                    ? 'All tasks have a product group assigned. Great job!'
                    : 'No priority features mapped to this product.'}
                </div>
              )}
              </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
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
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
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
            )}
            </div>
          )}
      </>
    )}
  </div>
);
};
