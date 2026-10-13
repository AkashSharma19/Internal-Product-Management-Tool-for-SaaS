import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  ExternalLink,
  Calendar,
  Rocket,
  Layers,
  Presentation
} from 'lucide-react';
import {
  formatDateToShortPattern
} from '../common/tableUtils';
import {
  ClickUpStatusBadge
} from '../common/TableShared';

export const AdoptionTable: React.FC = () => {
  const { 
    featureAdoptions, updateFeatureAdoption,
    productItems, updateProductItem,
    dailyIssues, updateDailyIssue,
    categories, programs, cohorts, productGroups,
    setPreviewProductId
  } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Active categories, cohorts, and programs
  const activeCategories = (categories || []).filter(c => c.active !== false);
  const activeCohorts = cohorts.filter(c => c.active !== false);
  const activePrograms = programs || [];
  const hasUncategorized = activePrograms.some(p => !p.categoryId);

  // Filter programs based on selected category
  const displayedPrograms = useMemo(() => {
    if (!selectedCategoryId) return activePrograms;
    if (selectedCategoryId === '__uncategorized__') {
      return activePrograms.filter(p => !p.categoryId);
    }
    return activePrograms.filter(p => p.categoryId === selectedCategoryId);
  }, [activePrograms, selectedCategoryId]);

  // Selected Program Tab State
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  // Keep selectedProgramId in sync with displayedPrograms
  useEffect(() => {
    if (displayedPrograms.length > 0) {
      if (!displayedPrograms.some(p => p.id === selectedProgramId)) {
        setSelectedProgramId(displayedPrograms[0].id);
      }
    } else {
      setSelectedProgramId('');
    }
  }, [displayedPrograms, selectedProgramId]);

  // Determine cohorts to display based on selected program tab
  const currentProgramId = selectedProgramId || (displayedPrograms[0]?.id || '');
  const displayCohorts = activeCohorts.filter(c => c.programId === currentProgramId);

  // Derive tasks that have "Conduct Demo" enabled
  interface DemoTaskItem {
    id: string;
    feature: string;
    product: string;
    cohort: string;
    rawType: 'product' | 'issue' | 'adoption';
    clickupStatus?: string;
    clickupSubtasksCount?: number;
    taskLink?: string;
    finalRelease?: string;
    committedDate?: string;
  }

  const demoTasks = useMemo<DemoTaskItem[]>(() => {
    const pList: DemoTaskItem[] = (productItems || [])
      .filter(p => !!p.conductDemo)
      .map(p => ({
        id: p.id,
        feature: p.feature || p.description || `Task #${p.id}`,
        product: p.product || '',
        cohort: p.demoCohorts || '',
        rawType: 'product',
        clickupStatus: p.clickupStatus || '',
        clickupSubtasksCount: p.clickupSubtasksCount || 0,
        taskLink: p.taskLink || '',
        finalRelease: p.finalRelease || '',
        committedDate: p.committedDate || ''
      }));

    const dList: DemoTaskItem[] = (dailyIssues || [])
      .filter(d => !!d.conductDemo)
      .map(d => ({
        id: d.id,
        feature: d.module || d.issues || `Issue #${d.id}`,
        product: d.product || '',
        cohort: d.demoCohorts || '',
        rawType: 'issue',
        clickupStatus: d.clickupStatus || '',
        clickupSubtasksCount: d.clickupSubtasksCount || 0,
        taskLink: d.taskLink || '',
        finalRelease: d.finalRelease || '',
        committedDate: d.committedDate || ''
      }));

    const aList: DemoTaskItem[] = (featureAdoptions || [])
      .filter(a => !pList.some(p => p.id === a.id) && !dList.some(d => d.id === a.id))
      .map(a => ({
        id: a.id,
        feature: a.feature,
        product: a.product,
        cohort: a.cohort || '',
        rawType: 'adoption',
        clickupStatus: '',
        clickupSubtasksCount: 0,
        taskLink: '',
        finalRelease: a.launchDate || '',
        committedDate: ''
      }));

    return [...pList, ...dList, ...aList];
  }, [productItems, dailyIssues, featureAdoptions]);

  const filtered = demoTasks.filter(item => {
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.cohort || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.clickupStatus || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.finalRelease || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.committedDate || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  // Helper to check if a specific cohort is marked as demoed for a task
  const isCohortChecked = (cohortStr: string | undefined, c: (typeof cohorts)[0]): boolean => {
    if (!cohortStr) return false;
    const tokens = cohortStr.split(',').map(s => s.trim()).filter(Boolean);
    
    // 1. Direct match on unique cohort ID (primary & robust across programs/categories)
    if (tokens.includes(c.id)) return true;
    
    // 2. Direct match on program-scoped keys
    if (tokens.includes(`${c.programId}:${c.id}`) || tokens.includes(`${c.programId}:${c.name}`)) return true;

    // 3. Fallback for legacy data where only cohort name was stored:
    // Only match legacy name if no other active cohort in a DIFFERENT program has the exact same name
    if (tokens.includes(c.name)) {
      const hasDuplicateNameInOtherProgram = activeCohorts.some(
        other => other.id !== c.id && other.name.trim().toLowerCase() === c.name.trim().toLowerCase()
      );
      if (!hasDuplicateNameInOtherProgram) {
        return true;
      }
    }

    return false;
  };

  const sorted = [...filtered];
  if (sortField) {
    sorted.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (sortField === 'feature') {
        valA = a.feature;
        valB = b.feature;
      } else if (sortField === 'product') {
        valA = a.product;
        valB = b.product;
      } else if (sortField === 'adoptionRate') {
        const getRate = (item: DemoTaskItem) => {
          const checkedCount = displayCohorts.filter(c => isCohortChecked(item.cohort, c)).length;
          return displayCohorts.length > 0 ? (checkedCount / displayCohorts.length) : 0;
        };
        valA = getRate(a);
        valB = getRate(b);
      } else if (sortField.startsWith('cohort-')) {
        const cohortId = sortField.replace('cohort-', '');
        const targetCohort = displayCohorts.find(c => c.id === cohortId || c.name === cohortId);
        valA = targetCohort && isCohortChecked(a.cohort, targetCohort) ? 1 : 0;
        valB = targetCohort && isCohortChecked(b.cohort, targetCohort) ? 1 : 0;
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const handleCohortToggle = (c: (typeof cohorts)[0], isChecked: boolean, target: DemoTaskItem) => {
    const cohortsList = (target.cohort || '').split(',').map(s => s.trim()).filter(Boolean);
    let updatedCohorts: string[];
    
    if (isChecked) {
      // Add unique cohort ID, and clean any legacy ambiguous name
      updatedCohorts = Array.from(new Set([...cohortsList.filter(x => x !== c.name), c.id]));
    } else {
      // Remove unique cohort ID, scoped keys, and legacy name
      updatedCohorts = cohortsList.filter(x => 
        x !== c.id && 
        x !== `${c.programId}:${c.id}` && 
        x !== `${c.programId}:${c.name}` && 
        x !== c.name
      );
    }
    const newCohortStr = updatedCohorts.join(', ');

    if (target.rawType === 'product') {
      updateProductItem(target.id, { demoCohorts: newCohortStr });
    } else if (target.rawType === 'issue') {
      updateDailyIssue(target.id, { demoCohorts: newCohortStr });
    } else if (target.rawType === 'adoption') {
      updateFeatureAdoption(target.id, { cohort: newCohortStr });
    }
  };

  return (
    <>
      <TabContainer
        title="Demo Tracker"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterComponent={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="filter-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              style={{
                height: '32px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="">All Categories</option>
              {activeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              {hasUncategorized && (
                <option value="__uncategorized__">Uncategorized / Existing</option>
              )}
            </select>
          </div>
        }
      >
        {/* Horizontal Program Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '1rem', 
            borderBottom: '1px solid var(--border)',
            padding: '0 1.5rem',
            flexShrink: 0,
            backgroundColor: 'var(--panel-bg)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            marginBottom: '0.75rem'
          }}
        >
          {displayedPrograms.length === 0 ? (
            <div style={{ padding: '0.75rem 0.25rem', fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No programs found for this category
            </div>
          ) : (
            displayedPrograms.map(program => {
              const isActive = (selectedProgramId || (displayedPrograms[0]?.id || '')) === program.id;
              const programCohorts = activeCohorts.filter(c => c.programId === program.id);
              return (
                <button
                  key={program.id}
                  onClick={() => {
                    setSelectedProgramId(program.id);
                  }}
                  style={{
                    padding: '0.75rem 0.25rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {program.name}
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.625rem', 
                      padding: '1px 5px', 
                      borderRadius: '999px',
                      background: isActive ? 'var(--primary-glow)' : 'var(--background-alt)',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                  >
                    {programCohorts.length}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {displayedPrograms.length === 0 ? (
          <div style={{ 
            padding: '5rem 2rem', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <Layers size={40} style={{ opacity: 0.3, color: 'var(--primary)' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              No programs found for this category
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
              There are no programs assigned to this category. You can configure programs and categories in <strong>Config &gt; Categories, Programs &amp; Cohorts</strong>.
            </div>
          </div>
        ) : displayCohorts.length === 0 ? (
          <div style={{ 
            padding: '5rem 2rem', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <Layers size={40} style={{ opacity: 0.3, color: 'var(--primary)' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              No cohorts found for this program
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
              Add student cohorts to this program in <strong>Config &gt; Categories, Programs &amp; Cohorts</strong> to track feature demo across cohorts.
            </div>
          </div>
        ) : demoTasks.length === 0 ? (
          <div style={{ 
            padding: '5rem 2rem', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <Presentation size={42} style={{ opacity: 0.35, color: 'var(--primary)' }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              No Tasks Selected for Demo
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.5 }}>
              To track demos across cohorts, open any feature or daily need preview page and turn ON the <strong>Conduct Demo</strong> toggle.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="grid-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <th 
                  className="sticky-header-col"
                  style={{ 
                    verticalAlign: 'middle', 
                    width: '320px',
                    minWidth: '320px', 
                    maxWidth: '340px',
                    whiteSpace: 'nowrap', 
                    borderRight: '2px solid var(--border)',
                    padding: '8px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                    <span 
                      onClick={() => handleSort('feature')} 
                      style={{ cursor: 'pointer', flex: 1 }}
                      title="Sort by Task / Feature Name"
                    >
                      Feature & Status {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}
                    </span>
                    <button 
                      onClick={() => handleSort('adoptionRate')}
                      style={{ 
                        padding: '2px 6px', 
                        fontSize: '0.625rem', 
                        borderRadius: '4px', 
                        border: '1px solid var(--border)', 
                        background: sortField === 'adoptionRate' ? 'var(--primary-glow)' : 'var(--background-alt)', 
                        color: sortField === 'adoptionRate' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        userSelect: 'none'
                      }}
                      title="Sort by Demo Completion Rate"
                    >
                      Demo % {sortField === 'adoptionRate' ? (sortAsc ? '▲' : '▼') : ''}
                    </button>
                  </div>
                </th>
                {displayCohorts.map((c, idx) => {
                  const isBoundary = idx > 0 && c.programId !== displayCohorts[idx - 1].programId;
                  return (
                    <th 
                      key={c.id} 
                      onClick={() => handleSort(`cohort-${c.id}`)} 
                      style={{ 
                        textAlign: 'center', 
                        padding: '6px 8px', 
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '95px',
                        width: '95px',
                        borderLeft: isBoundary ? '2px solid var(--border)' : undefined,
                        verticalAlign: 'middle'
                      }}
                    >
                      <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.name} {sortField === `cohort-${c.id}` ? (sortAsc ? '▲' : '▼') : ''}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={1 + displayCohorts.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No demo tasks match your search "{searchQuery}".
                  </td>
                </tr>
              ) : (
                sorted.map(adopt => {
                  const displayRate = (() => {
                    const checkedInProgram = displayCohorts.filter(c => isCohortChecked(adopt.cohort, c)).length;
                    return displayCohorts.length > 0 
                      ? Math.round((checkedInProgram / displayCohorts.length) * 100)
                      : 0;
                  })();
                  
                  return (
                    <React.Fragment key={adopt.id}>
                      <tr>
                        {/* Feature & Product Group sticky column */}
                        <td 
                          className="sticky-col" 
                          style={{ 
                            width: '320px',
                            minWidth: '320px', 
                            maxWidth: '340px',
                            whiteSpace: 'normal',
                            borderRight: '2px solid var(--border)',
                            background: `linear-gradient(to right, rgba(99, 102, 241, 0.08) ${displayRate}%, transparent ${displayRate}%)`
                          }}
                        >
                          <div 
                            onClick={() => setPreviewProductId(adopt.id)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', cursor: 'pointer' }}
                            title="Click to view task details"
                          >
                            {/* Feature Name & Demo Completion Rate */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                {adopt.feature}
                              </span>
                              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--primary)', padding: '2px 6px', background: 'var(--primary-glow)', borderRadius: '4px', flexShrink: 0 }}>
                                {displayRate}%
                              </span>
                            </div>

                            {/* Product Group & ClickUp Status */}
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{
                                display: 'inline-block',
                                background: (() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color + '22' : 'var(--surface-elevated)'; })(),
                                color: (() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color : 'var(--text-secondary)'; })(),
                                border: `1px solid ${(() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color + '55' : 'var(--border)'; })()}`,
                                borderRadius: '6px',
                                padding: '1px 7px',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap',
                              }}>{adopt.product || '—'}</span>

                              {adopt.clickupStatus ? (
                                <ClickUpStatusBadge 
                                  status={adopt.clickupStatus} 
                                  subtasksCount={adopt.clickupSubtasksCount} 
                                  taskLink={adopt.taskLink} 
                                />
                              ) : (
                                adopt.taskLink ? (
                                  <a 
                                    href={adopt.taskLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()} 
                                    style={{ 
                                      fontSize: '0.68rem', 
                                      color: 'var(--primary)', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '3px',
                                      textDecoration: 'none',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-light)',
                                      background: 'var(--surface-elevated)'
                                    }}
                                  >
                                    <ExternalLink size={10} /> ClickUp
                                  </a>
                                ) : null
                              )}
                            </div>

                            {/* Release Date & Committed Date Row */}
                            {(adopt.finalRelease || adopt.committedDate) ? (
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {adopt.committedDate && (
                                  <span 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '3px', 
                                      background: 'var(--surface-elevated)', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      border: '1px solid var(--border-light)' 
                                    }} 
                                    title="Committed Date"
                                  >
                                    <Calendar size={11} style={{ opacity: 0.7 }} />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>Committed:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateToShortPattern(adopt.committedDate)}</span>
                                  </span>
                                )}
                                {adopt.finalRelease && (
                                  <span 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '3px', 
                                      background: 'var(--surface-elevated)', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      border: '1px solid var(--border-light)' 
                                    }} 
                                    title="Release Date"
                                  >
                                    <Rocket size={11} style={{ opacity: 0.8, color: 'var(--primary)' }} />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>Release:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateToShortPattern(adopt.finalRelease)}</span>
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        
                        {/* Cohorts Columns Checkboxes */}
                        {displayCohorts.map((c, idx) => {
                          const isChecked = isCohortChecked(adopt.cohort, c);
                          const isBoundary = idx > 0 && c.programId !== displayCohorts[idx - 1].programId;
                          
                          return (
                            <td 
                              key={c.id} 
                              style={{ 
                                textAlign: 'center', 
                                borderLeft: isBoundary ? '2px solid var(--border)' : undefined
                              }} 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => handleCohortToggle(c, !isChecked, adopt)}
                                style={{ 
                                  cursor: 'pointer', 
                                  width: '15px', 
                                  height: '15px', 
                                  accentColor: 'var(--primary)'
                                }} 
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </TabContainer>

    </>
  );
};
