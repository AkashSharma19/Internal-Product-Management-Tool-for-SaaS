import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Edit2,
  X,
  Check,
  User,
  Phone,
  MessageCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Copy,
  Upload,
  Mail
} from 'lucide-react';
import type {
  DirectoryContact
} from '../../types';

export const ContactsDirectoryTable: React.FC = () => {
  const {
    directoryContacts = [], addDirectoryContact, updateDirectoryContact, deleteDirectoryContact,
    cohorts = [], addCohort, updateCohort,
    programs = [], confirm, alert
  } = useDashboard();

  // Active selected Program Sub-Tab
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  // Active expanded Cohorts
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null);

  // Search query to filter contacts
  const [searchQuery, setSearchQuery] = useState('');

  // Cohort creation
  const [showAddCohortId, setShowAddCohortId] = useState<string | null>(null); // programId
  const [newCohortName, setNewCohortName] = useState('');

  // Department creation
  const [showAddDeptId, setShowAddDeptId] = useState<string | null>(null); // cohortId
  const [newDeptName, setNewDeptName] = useState('');

  // Contact import inline state
  const [showImportCohortId, setShowImportCohortId] = useState<string | null>(null); // target cohortId
  const [importSourceCohortId, setImportSourceCohortId] = useState<string>('');

  // Contact creation state per department
  const [activeFormId, setActiveFormId] = useState<{ cohortId: string; dept: string } | null>(null);
  
  // Fields for adding a contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactTier, setContactTier] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [contactDept, setContactDept] = useState('');

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<DirectoryContact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit contact state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editTier, setEditTier] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [editDept, setEditDept] = useState('');

  // Group email inline edit state
  const [editingDeptEmailKey, setEditingDeptEmailKey] = useState<string | null>(null); // format: `${cohortId}-${deptName}`
  const [tempDeptEmail, setTempDeptEmail] = useState('');

  // Set default expanded program / selected sub-tab on load
  useEffect(() => {
    if (programs.length > 0 && !selectedProgramId) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  // Handle autocomplete search
  useEffect(() => {
    if (!contactName.trim() || contactName.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = directoryContacts.filter(c => 
      c.name.toLowerCase().includes(contactName.toLowerCase())
    );
    // Deduplicate suggestions by unique name + email
    const unique: DirectoryContact[] = [];
    const seen = new Set();
    for (const item of filtered) {
      const key = `${item.name.toLowerCase()}_${item.email.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    setSuggestions(unique);
  }, [contactName, directoryContacts]);

  // Auto-mirror WhatsApp if empty or matches old mobile value
  const handleMobileChange = (val: string) => {
    setContactMobile(val);
    if (!contactWhatsapp || contactWhatsapp === contactMobile) {
      setContactWhatsapp(val);
    }
  };

  // Autocomplete selection handler
  const handleSelectSuggestion = (suggested: DirectoryContact) => {
    setContactName(suggested.name);
    setContactEmail(suggested.email || '');
    setContactMobile(suggested.mobile || '');
    setContactWhatsapp(suggested.whatsapp || '');
    setContactTier(suggested.tier || 'L0');
    setShowSuggestions(false);
  };

  // Copy Emails utility
  const copyToClipboard = (emails: string[], typeLabel: string) => {
    const uniqueEmails = Array.from(new Set(emails.map(e => e.trim()).filter(Boolean)));
    if (uniqueEmails.length === 0) {
      alert(`No valid emails found for this ${typeLabel}.`);
      return;
    }
    const text = uniqueEmails.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied ${uniqueEmails.length} unique email(s) for ${typeLabel} to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy emails:', err);
    });
  };

  // Add Cohort handler
  const handleCreateCohort = (programId: string) => {
    if (!newCohortName.trim()) return;
    const cleanName = newCohortName.trim();
    
    // Check if cohort name already exists
    if (cohorts.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.programId === programId)) {
      alert('Cohort already exists in this program.');
      return;
    }

    const generalProgramDepts = Array.from(new Set(
      directoryContacts
        .filter(c => c.programId === programId && !c.cohortId && c.department && c.department.trim() !== '')
        .map(c => c.department.trim())
    ));
    const defaultDepts = ['Operations', 'Academics', 'Placement'];
    const rawDepts = [...defaultDepts, ...generalProgramDepts];

    // Deduplicate case-insensitively
    const seenDepts = new Set<string>();
    const finalDepts: string[] = [];
    for (const d of rawDepts) {
      const lower = d.toLowerCase();
      if (!seenDepts.has(lower)) {
        seenDepts.add(lower);
        finalDepts.push(d);
      }
    }

    const newCohortItem = {
      id: `cohort-${Date.now()}`,
      name: cleanName,
      programId: programId,
      active: true,
      departments: finalDepts
    };

    addCohort(newCohortItem);
    setNewCohortName('');
    setShowAddCohortId(null);
    setExpandedCohortId(newCohortItem.id);
  };

  // Add Department handler
  const handleCreateDepartment = (cohortId: string) => {
    if (!newDeptName.trim()) return;
    const cleanName = newDeptName.trim();
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;

    const currentDepts = cohort.departments || [];
    if (currentDepts.some(d => d.toLowerCase() === cleanName.toLowerCase())) {
      alert('Department already exists in this cohort.');
      return;
    }

    const updatedDepts = [...currentDepts, cleanName];
    updateCohort(cohortId, { departments: updatedDepts });
    setNewDeptName('');
    setShowAddDeptId(null);
  };

  // Delete Department handler
  const handleDeleteDepartment = async (cohortId: string, deptName: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;

    const hasContacts = directoryContacts.some(c => c.cohortId === cohortId && c.department === deptName);
    if (hasContacts) {
      alert('Cannot delete department because it still contains contacts. Please remove or move them first.');
      return;
    }

    if (await confirm(`Are you sure you want to delete the department "${deptName}"?`, "Delete Department")) {
      const updatedDepts = (cohort.departments || []).filter(d => d !== deptName);
      updateCohort(cohortId, { departments: updatedDepts });
    }
  };

  // Save Department Group Email handler
  const handleSaveDeptEmail = (cohortId: string, deptName: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;
    
    const updatedEmails = { ...(cohort.departmentEmails || {}) };
    const emailVal = tempDeptEmail.trim();
    
    if (emailVal === '') {
      delete updatedEmails[deptName];
    } else {
      updatedEmails[deptName] = emailVal;
    }
    
    updateCohort(cohortId, { departmentEmails: updatedEmails });
    setEditingDeptEmailKey(null);
    setTempDeptEmail('');
  };

  // Add Contact handler
  const handleAddContact = (programId: string, cohortId: string, department: string) => {
    if (!contactName.trim()) {
      alert('Contact Name is required.');
      return;
    }

    const finalDept = cohortId === '' ? contactDept.trim() : department;

    const newContact: DirectoryContact = {
      id: `dir-contact-${Date.now()}`,
      name: contactName.trim(),
      email: contactEmail.trim(),
      mobile: contactMobile.trim(),
      whatsapp: contactWhatsapp.trim(),
      tier: contactTier,
      programId,
      cohortId,
      department: finalDept
    };

    addDirectoryContact(newContact);

    // If it's a general POC and they provided a department, add this department to all cohorts of the program
    if (cohortId === '' && finalDept) {
      const programCohorts = cohorts.filter(c => c.programId === programId);
      programCohorts.forEach(cohort => {
        const currentDepts = cohort.departments || [];
        const hasDept = currentDepts.some(d => d.toLowerCase() === finalDept.toLowerCase());
        if (!hasDept) {
          const updatedDepts = [...currentDepts, finalDept];
          updateCohort(cohort.id, { departments: updatedDepts });
        }
      });
    }

    // Reset inputs
    setContactName('');
    setContactEmail('');
    setContactMobile('');
    setContactWhatsapp('');
    setContactTier('L0');
    setContactDept('');
    setActiveFormId(null);
  };

  // Import Cohort Contacts logic
  const handleImportContacts = (targetCohortId: string, sourceCohortId: string) => {
    if (!sourceCohortId || !targetCohortId) return;
    const targetCohort = cohorts.find(c => c.id === targetCohortId);
    const sourceCohort = cohorts.find(c => c.id === sourceCohortId);
    if (!targetCohort || !sourceCohort) return;

    const sourceContacts = directoryContacts.filter(c => c.cohortId === sourceCohortId);
    if (sourceContacts.length === 0) {
      alert('Selected cohort has no contacts to import.');
      return;
    }

    const targetContacts = directoryContacts.filter(c => c.cohortId === targetCohortId);
    let importedCount = 0;
    const departmentsToUpdate = new Set<string>(targetCohort.departments || []);

    sourceContacts.forEach((srcContact, index) => {
      // Avoid duplicates by email inside the same cohort
      const isDuplicate = srcContact.email && targetContacts.some(
        tc => tc.email.toLowerCase() === srcContact.email.toLowerCase()
      );
      if (isDuplicate) return;

      const newContact: DirectoryContact = {
        id: `dir-contact-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        name: srcContact.name,
        email: srcContact.email || '',
        mobile: srcContact.mobile || '',
        whatsapp: srcContact.whatsapp || '',
        tier: srcContact.tier || 'L0',
        programId: targetCohort.programId,
        cohortId: targetCohortId,
        department: srcContact.department
      };

      addDirectoryContact(newContact);
      departmentsToUpdate.add(srcContact.department);
      importedCount++;
    });

    // Add any new department categories to target cohort
    const currentDepts = targetCohort.departments || [];
    if (departmentsToUpdate.size > currentDepts.length) {
      updateCohort(targetCohortId, { departments: Array.from(departmentsToUpdate) });
    }

    alert(`Successfully imported ${importedCount} contact(s) into ${targetCohort.name}!`);
    setShowImportCohortId(null);
    setImportSourceCohortId('');
  };

  // Edit Contact Trigger
  const handleStartEdit = (contact: DirectoryContact) => {
    setEditingContactId(contact.id);
    setEditName(contact.name);
    setEditEmail(contact.email || '');
    setEditMobile(contact.mobile || '');
    setEditWhatsapp(contact.whatsapp || '');
    setEditTier(contact.tier || 'L0');
    setEditDept(contact.department || '');
  };

  // Save Contact Edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Name is required');
      return;
    }
    updateDirectoryContact(id, {
      name: editName.trim(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      whatsapp: editWhatsapp.trim(),
      tier: editTier,
      department: editDept.trim()
    });
    setEditingContactId(null);
  };

  // Filter contacts by search query
  const getFilteredContacts = (contactsList: DirectoryContact[]) => {
    let list = contactsList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = contactsList.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.mobile.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query)
      );
    }
    
    // Sort by tier: L2 > L1 > L0, then alphabetically by name
    const tierOrder = { 'L2': 2, 'L1': 1, 'L0': 0 };
    return [...list].sort((a, b) => {
      const scoreA = tierOrder[a.tier] ?? 0;
      const scoreB = tierOrder[b.tier] ?? 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const getTierBadgeStyle = (tier: string) => {
    if (tier === 'L0') {
      return { background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' };
    }
    if (tier === 'L1') {
      return { background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.15)' };
    }
    return { background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.15)' };
  };

  // Get active Program object
  const activeProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  return (
    <>
      <TabContainer
        title="Contacts Directory"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search directory contacts..."
      >
        <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          
          {/* PROGRAM SUB-TABS ROW */}
          <div 
            style={{
              display: 'flex',
              gap: '1.5rem',
              borderBottom: '1.5px solid var(--border)',
              padding: '0 1.5rem',
              flexShrink: 0,
              backgroundColor: 'var(--panel-bg)',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {programs.map(program => {
              const activeCohortIds = new Set(cohorts.filter(c => c.programId === program.id && c.active).map(c => c.id));
              const programContacts = directoryContacts.filter(c => 
                c.programId === program.id && 
                (!c.cohortId || activeCohortIds.has(c.cohortId))
              );
              const isActive = selectedProgramId === program.id;

              return (
                <button
                  key={program.id}
                  onClick={() => {
                    setSelectedProgramId(program.id);
                    setShowAddCohortId(null);
                    setExpandedCohortId(null);
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
                    transition: 'all 0.2s',
                    outline: 'none',
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
                    {programContacts.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE PROGRAM BLOCK */}
          {activeProgram && (() => {
            const programCohorts = cohorts.filter(c => c.programId === activeProgram.id && c.active);
            const programContacts = directoryContacts.filter(c => c.programId === activeProgram.id);
            const programEmails = programContacts.map(c => c.email);
            const generalContacts = programContacts.filter(c => !c.cohortId);
            const filteredGeneralContacts = getFilteredContacts(generalContacts);

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* GENERAL PROGRAM POCs SECTION (Boxless style matching rest of UI) */}
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1.5px solid var(--border)' }}>
                  <div style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        General Program POCs
                      </span>
                      <span className="badge" style={{ fontSize: '0.625rem', padding: '1.5px 5px', borderRadius: '10px', background: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {generalContacts.length}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (activeFormId?.cohortId === 'general') {
                          setActiveFormId(null);
                        } else {
                          setActiveFormId({ cohortId: 'general', dept: 'general' });
                          setContactName('');
                          setContactEmail('');
                          setContactMobile('');
                          setContactWhatsapp('');
                          setContactTier('L0');
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', height: '22px' }}
                    >
                      <Plus size={9} />
                      Add General POC
                    </button>
                  </div>

                  {/* Inline Add General POC Form */}
                  {activeFormId?.cohortId === 'general' && (
                    <div style={{ padding: '0.75rem 1.5rem 0.75rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                      <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Add General Program POC</h4>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Name & Autocomplete */}
                        <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                          <input 
                            type="text"
                            value={contactName}
                            onChange={(e) => {
                              setContactName(e.target.value);
                              setShowSuggestions(true);
                            }}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="Search/Type Name..."
                            onFocus={() => setShowSuggestions(true)}
                          />
                          {/* Auto Suggestions */}
                          {showSuggestions && suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 150, backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '4px', boxShadow: 'var(--shadow-sm)', maxHeight: '140px', overflowY: 'auto' }}>
                              {suggestions.map(sug => (
                                <div 
                                  key={sug.id}
                                  onClick={() => handleSelectSuggestion(sug)}
                                  style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.7rem' }}
                                  className="suggestion-item"
                                >
                                  <div style={{ fontWeight: 600 }}>{sug.name}</div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{sug.email}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div style={{ flex: 1.2, minWidth: '150px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                          <input 
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="email@example.com"
                          />
                        </div>

                        {/* Mobile */}
                        <div style={{ flex: 0.8, minWidth: '110px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile</label>
                          <input 
                            type="text"
                            value={contactMobile}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="9999988888"
                          />
                        </div>

                        {/* WhatsApp */}
                        <div style={{ flex: 0.8, minWidth: '110px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp</label>
                          <input 
                            type="text"
                            value={contactWhatsapp}
                            onChange={(e) => setContactWhatsapp(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="WhatsApp..."
                          />
                        </div>

                        {/* Tier */}
                        <div style={{ flex: 0.5, minWidth: '70px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier</label>
                          <select 
                            value={contactTier}
                            onChange={(e) => setContactTier(e.target.value as any)}
                            className="form-control"
                            style={{ padding: '3px 6px', fontSize: '0.725rem', width: '100%', height: '26px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                          >
                            <option value="L0">L0</option>
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                          </select>
                        </div>

                        {/* Department */}
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department</label>
                          <input 
                            type="text"
                            value={contactDept}
                            onChange={(e) => setContactDept(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="e.g. Operations"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                        <button 
                          onClick={() => handleAddContact(activeProgram.id, '', '')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setActiveFormId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                        >
                          Cancel
                        </button>
                      </div>
                      {showSuggestions && (
                        <div onClick={() => setShowSuggestions(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 140, background: 'transparent' }} />
                      )}
                    </div>
                  )}

                  {/* General POCs Table */}
                  <div className="table-responsive" style={{ paddingLeft: '3.5rem', background: 'transparent', overflowX: 'auto' }}>
                    <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Name</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Department</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Email</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Mobile</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>WhatsApp</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-secondary)', width: '60px', fontWeight: 600, border: 'none' }}>Tier</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', width: '50px', border: 'none' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGeneralContacts.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.7rem' }}>
                              No general POCs configured for this program.
                            </td>
                          </tr>
                        ) : (
                          filteredGeneralContacts.map(contact => {
                            const isEditing = editingContactId === contact.id;

                            return (
                              <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-light)', background: 'transparent' }}>
                                {/* Name */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 500, border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                    />
                                  ) : (
                                    contact.name
                                  )}
                                </td>

                                {/* Department */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editDept}
                                      onChange={(e) => setEditDept(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                    />
                                  ) : (
                                    contact.department || '—'
                                  )}
                                </td>

                                {/* Email */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="email" 
                                      value={editEmail}
                                      onChange={(e) => setEditEmail(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '180px' }}
                                    />
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <span>{contact.email || '—'}</span>
                                      {contact.email && (
                                        <button 
                                          onClick={() => copyToClipboard([contact.email], contact.name)}
                                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
                                          title="Copy email"
                                        >
                                          <Copy size={9} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Mobile */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editMobile}
                                      onChange={(e) => setEditMobile(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                    />
                                  ) : (
                                    contact.mobile ? (
                                      <a href={`tel:${contact.mobile}`} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                                        <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                                        {contact.mobile}
                                      </a>
                                    ) : '—'
                                  )}
                                </td>

                                {/* WhatsApp */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editWhatsapp}
                                      onChange={(e) => setEditWhatsapp(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                    />
                                  ) : (
                                    contact.whatsapp ? (
                                      <a 
                                        href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                      >
                                        <MessageCircle size={10} style={{ color: '#25D366' }} />
                                        {contact.whatsapp}
                                      </a>
                                    ) : '—'
                                  )}
                                </td>

                                {/* Tier */}
                                <td style={{ padding: '6px 10px', textAlign: 'center', border: 'none' }}>
                                  {isEditing ? (
                                    <select 
                                      value={editTier}
                                      onChange={(e) => setEditTier(e.target.value as any)}
                                      className="form-control"
                                      style={{ padding: '2px 4px', fontSize: '0.7rem', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                    >
                                      <option value="L0">L0</option>
                                      <option value="L1">L1</option>
                                      <option value="L2">L2</option>
                                    </select>
                                  ) : (
                                    <span 
                                      className="badge" 
                                      style={{ 
                                        fontSize: '0.6rem', 
                                        padding: '1px 5px',
                                        fontWeight: 600,
                                        borderRadius: '999px',
                                        ...getTierBadgeStyle(contact.tier || 'L0') 
                                      }}
                                    >
                                      {contact.tier || 'L0'}
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '6px 10px', border: 'none' }}>
                                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={() => handleSaveEdit(contact.id)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }}
                                          title="Save Changes"
                                        >
                                          <CheckCircle size={11} />
                                        </button>
                                        <button 
                                          onClick={() => setEditingContactId(null)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                          title="Cancel"
                                        >
                                          <X size={11} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleStartEdit(contact)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                                          title="Edit Contact"
                                        >
                                          <Edit2 size={10} />
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            if (await confirm(`Are you sure you want to remove this general POC?`, "Delete General POC")) {
                                              deleteDirectoryContact(contact.id);
                                            }
                                          }} 
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                          title="Delete Contact"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVE PROGRAM ACTION HEADER (Cohorts section starts here) */}
                <div 
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Cohorts in {activeProgram.name}
                    </span>
                    <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '10px' }}>
                      {programCohorts.length} Cohorts
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => copyToClipboard(programEmails, `${activeProgram.name} Program`)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', height: '22px' }}
                      title="Copy all emails in this program"
                    >
                      <Copy size={10} />
                      Copy Emails
                    </button>
                  </div>
                </div>

                {/* ADD COHORT INLINE INPUT ROW */}
                {showAddCohortId === activeProgram.id && (
                  <div style={{ padding: '0.6rem 1.5rem 0.6rem 2.5rem', borderBottom: '1px solid var(--border)', background: 'var(--background)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text"
                      placeholder="Cohort Name (e.g. UG2026)"
                      value={newCohortName}
                      onChange={(e) => setNewCohortName(e.target.value)}
                      className="form-control"
                      style={{ maxWidth: '200px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCohort(activeProgram.id)}
                    />
                    <button 
                      onClick={() => handleCreateCohort(activeProgram.id)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setShowAddCohortId(null)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* COHORTS ACCORDION LIST */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {programCohorts.length === 0 ? (
                    <div style={{ padding: '1.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      No cohorts found. Click "Add Cohort" to create one.
                    </div>
                  ) : (
                    programCohorts.map(cohort => {
                      const isCohortExpanded = expandedCohortId === cohort.id;
                      const cohortContacts = directoryContacts.filter(c => c.cohortId === cohort.id);
                      const cohortEmails = cohortContacts.map(c => c.email);

                      // Get department names from General Program POCs of active program
                      const generalProgramDepts = Array.from(new Set(
                        directoryContacts
                          .filter(c => c.programId === activeProgram.id && !c.cohortId && c.department && c.department.trim() !== '')
                          .map(c => c.department.trim())
                      ));

                      const rawDepts = [
                        ...(cohort.departments || []),
                        ...generalProgramDepts
                      ];

                      // Deduplicate case-insensitively
                      const seenDepts = new Set<string>();
                      const departmentsList: string[] = [];
                      for (const d of rawDepts) {
                        const lower = d.toLowerCase();
                        if (!seenDepts.has(lower)) {
                          seenDepts.add(lower);
                          departmentsList.push(d);
                        }
                      }

                      return (
                        <div key={cohort.id} style={{ display: 'flex', flexDirection: 'column' }}>
                          
                          {/* COHORT HEADER ROW */}
                          <div 
                            onClick={() => setExpandedCohortId(isCohortExpanded ? null : cohort.id)}
                            className="accordion-header-row"
                            style={{
                              padding: '0.6rem 1.5rem 0.6rem 2.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              borderBottom: '1px solid var(--border-light)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isCohortExpanded ? <ChevronDown size={13} style={{ color: 'var(--primary)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
                              <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                {cohort.name}
                              </span>
                              <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '999px', background: 'var(--background-alt)', color: 'var(--text-secondary)' }}>
                                {departmentsList.length} Depts
                              </span>
                              <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(123, 97, 255, 0.08)', color: '#7b61ff' }}>
                                {cohortContacts.length} Contacts
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => copyToClipboard(cohortEmails, `Cohort ${cohort.name}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', height: '22px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="Copy all emails in this cohort"
                              >
                                <Copy size={9} />
                                Copy Emails
                              </button>
                              <button 
                                onClick={() => {
                                  setShowImportCohortId(showImportCohortId === cohort.id ? null : cohort.id);
                                  setImportSourceCohortId('');
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', height: '22px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="Import contacts from another cohort"
                              >
                                <Upload size={10} />
                                Import
                              </button>
                            </div>
                          </div>

                          {/* IMPORT COHORT INLINE SELECTOR */}
                          {showImportCohortId === cohort.id && (
                            <div style={{ padding: '0.5rem 1.5rem 0.5rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background-alt)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Import from:</span>
                              <select
                                value={importSourceCohortId}
                                onChange={(e) => setImportSourceCohortId(e.target.value)}
                                className="form-control"
                                style={{ maxWidth: '240px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                              >
                                <option value="">-- Select Cohort --</option>
                                {programs.map(p => {
                                  const otherCohorts = cohorts.filter(c => c.programId === p.id && c.id !== cohort.id && c.active);
                                  if (otherCohorts.length === 0) return null;
                                  return (
                                    <optgroup key={p.id} label={`${p.name} Program`}>
                                      {otherCohorts.map(oc => {
                                        const ocContactsCount = directoryContacts.filter(dc => dc.cohortId === oc.id).length;
                                        return (
                                          <option key={oc.id} value={oc.id}>
                                            {oc.name} ({ocContactsCount} contacts)
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  );
                                })}
                              </select>
                              <button 
                                onClick={() => handleImportContacts(cohort.id, importSourceCohortId)}
                                className="btn btn-primary btn-sm"
                                disabled={!importSourceCohortId}
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px', opacity: !importSourceCohortId ? 0.5 : 1, cursor: !importSourceCohortId ? 'not-allowed' : 'pointer' }}
                              >
                                Import
                              </button>
                              <button 
                                onClick={() => setShowImportCohortId(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* ADD DEPARTMENT INLINE INPUT ROW */}
                          {showAddDeptId === cohort.id && (
                            <div style={{ padding: '0.5rem 1.5rem 0.5rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input 
                                type="text"
                                placeholder="Department Name (e.g. Placement)"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                className="form-control"
                                style={{ maxWidth: '180px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateDepartment(cohort.id)}
                              />
                              <button 
                                onClick={() => handleCreateDepartment(cohort.id)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setShowAddDeptId(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* DEPARTMENTS FLAT LIST */}
                          {isCohortExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {departmentsList.length === 0 ? (
                                <div style={{ padding: '0.75rem 3.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                                  No departments found. Add a department to get started.
                                </div>
                              ) : (
                                departmentsList.map(deptName => {
                                  const deptContacts = cohortContacts.filter(
                                    c => c.department?.toLowerCase() === deptName.toLowerCase()
                                  );
                                  const filteredDeptContacts = getFilteredContacts(deptContacts);
                                  const deptEmails = deptContacts.map(c => c.email);
                                  const isFormActive = activeFormId?.cohortId === cohort.id && activeFormId?.dept === deptName;

                                  return (
                                    <div key={deptName} style={{ display: 'flex', flexDirection: 'column' }}>
                                      
                                      {/* DEPARTMENT FLAT HEADER ROW */}
                                      <div 
                                        style={{
                                          padding: '0.55rem 1.5rem 0.55rem 3.75rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          borderBottom: '1px solid var(--border-light)',
                                          background: 'var(--background-alt)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {deptName}
                                          </span>
                                          <span className="badge" style={{ fontSize: '0.6rem', padding: '0.5px 4px', borderRadius: '6px', background: 'var(--border)', color: 'var(--text-muted)' }}>
                                            {deptContacts.length}
                                          </span>

                                          {/* Group Email ID */}
                                          {editingDeptEmailKey === `${cohort.id}-${deptName}` ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.6rem' }} onClick={(e) => e.stopPropagation()}>
                                              <input 
                                                type="email"
                                                value={tempDeptEmail}
                                                onChange={(e) => setTempDeptEmail(e.target.value)}
                                                placeholder="Enter group email..."
                                                className="form-control"
                                                style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px', border: '1px solid var(--primary)', width: '170px', height: '20px' }}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleSaveDeptEmail(cohort.id, deptName);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingDeptEmailKey(null);
                                                  }
                                                }}
                                              />
                                              <button
                                                onClick={() => handleSaveDeptEmail(cohort.id, deptName)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                title="Save Group Email"
                                              >
                                                <Check size={12} />
                                              </button>
                                              <button
                                                onClick={() => setEditingDeptEmailKey(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                title="Cancel"
                                              >
                                                <X size={12} />
                                              </button>
                                            </div>
                                          ) : cohort.departmentEmails?.[deptName] ? (
                                            <div 
                                              style={{ 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '0.35rem', 
                                                background: 'rgba(123, 97, 255, 0.06)', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                border: '1px solid rgba(123, 97, 255, 0.18)', 
                                                marginLeft: '0.6rem',
                                                height: '20px'
                                              }}
                                            >
                                              <Mail size={9} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                                              <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 500 }}>
                                                {cohort.departmentEmails[deptName]}
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(cohort.departmentEmails![deptName]);
                                                  alert(`Copied ${deptName} Group Email to clipboard!`);
                                                }}
                                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="Copy Group Email"
                                              >
                                                <Copy size={9} />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingDeptEmailKey(`${cohort.id}-${deptName}`);
                                                  setTempDeptEmail(cohort.departmentEmails?.[deptName] || '');
                                                }}
                                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="Edit Group Email"
                                              >
                                                <Edit2 size={9} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingDeptEmailKey(`${cohort.id}-${deptName}`);
                                                setTempDeptEmail('');
                                              }}
                                              className="btn btn-secondary btn-sm"
                                              style={{ 
                                                padding: '1px 6px', 
                                                fontSize: '0.65rem', 
                                                borderRadius: '4px', 
                                                height: '20px', 
                                                marginLeft: '0.6rem', 
                                                border: '1px dashed var(--border)',
                                                background: 'transparent',
                                                color: 'var(--text-secondary)',
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '0.25rem',
                                                cursor: 'pointer'
                                              }}
                                              title="Add Group Email ID"
                                            >
                                              <Plus size={9} />
                                              Group Email
                                            </button>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                          <button 
                                            onClick={() => copyToClipboard(deptEmails, `${deptName} Dept`)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px', height: '20px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                            title="Copy all emails in this department"
                                          >
                                            <Copy size={9} />
                                            Copy Emails
                                          </button>
                                          <button 
                                            onClick={() => {
                                              if (isFormActive) {
                                                setActiveFormId(null);
                                              } else {
                                                setActiveFormId({ cohortId: cohort.id, dept: deptName });
                                                setContactName('');
                                                setContactEmail('');
                                                setContactMobile('');
                                                setContactWhatsapp('');
                                                setContactTier('L0');
                                              }
                                            }}
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px', height: '20px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                          >
                                            <Plus size={9} />
                                            Add Contact
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteDepartment(cohort.id, deptName)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}
                                            title="Delete Department"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* INLINE ADD CONTACT FORM */}
                                      {isFormActive && (
                                        <div style={{ padding: '0.75rem 1.5rem 0.75rem 5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                                          <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Add New Contact</h4>
                                          
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {/* NAME & AUTOCOMPLETE */}
                                            <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                                              <input 
                                                type="text"
                                                value={contactName}
                                                onChange={(e) => {
                                                  setContactName(e.target.value);
                                                  setShowSuggestions(true);
                                                }}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="Search/Type Name..."
                                                onFocus={() => setShowSuggestions(true)}
                                              />
                                              {/* AUTOCOMPLETE SUGGESTIONS BOX */}
                                              {showSuggestions && suggestions.length > 0 && (
                                                <div 
                                                  style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    zIndex: 150,
                                                    backgroundColor: 'var(--panel-bg)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    maxHeight: '140px',
                                                    overflowY: 'auto'
                                                  }}
                                                >
                                                  {suggestions.map(sug => {
                                                    const parentCohort = cohorts.find(c => c.id === sug.cohortId);
                                                    return (
                                                      <div 
                                                        key={sug.id}
                                                        onClick={() => handleSelectSuggestion(sug)}
                                                        style={{
                                                          padding: '6px 8px',
                                                          cursor: 'pointer',
                                                          borderBottom: '1px solid var(--border)',
                                                          fontSize: '0.7rem',
                                                          textAlign: 'left'
                                                        }}
                                                        className="suggestion-item"
                                                      >
                                                        <div style={{ fontWeight: 600 }}>{sug.name}</div>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                                                          {sug.email} • {parentCohort?.name || 'Unknown'} ({sug.department})
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>

                                            {/* EMAIL */}
                                            <div style={{ flex: 1.2, minWidth: '150px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                                              <input 
                                                type="email"
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="email@example.com"
                                              />
                                            </div>

                                            {/* MOBILE */}
                                            <div style={{ flex: 0.8, minWidth: '110px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile</label>
                                              <input 
                                                type="text"
                                                value={contactMobile}
                                                onChange={(e) => handleMobileChange(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="9999988888"
                                              />
                                            </div>

                                            {/* WHATSAPP */}
                                            <div style={{ flex: 0.8, minWidth: '110px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp</label>
                                              <input 
                                                type="text"
                                                value={contactWhatsapp}
                                                onChange={(e) => setContactWhatsapp(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="WhatsApp Number..."
                                              />
                                            </div>

                                            {/* TIER */}
                                            <div style={{ flex: 0.5, minWidth: '70px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier</label>
                                              <select 
                                                value={contactTier}
                                                onChange={(e) => setContactTier(e.target.value as any)}
                                                className="form-control"
                                                style={{ padding: '3px 6px', fontSize: '0.725rem', width: '100%', height: '26px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                              >
                                                <option value="L0">L0</option>
                                                <option value="L1">L1</option>
                                                <option value="L2">L2</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                            <button 
                                              onClick={() => handleAddContact(activeProgram.id, cohort.id, deptName)}
                                              className="btn btn-primary btn-sm"
                                              style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                                            >
                                              Add Contact
                                            </button>
                                            <button 
                                              onClick={() => setActiveFormId(null)}
                                              className="btn btn-secondary btn-sm"
                                              style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                          {/* Suggestion closing clickaway */}
                                          {showSuggestions && (
                                            <div 
                                              onClick={() => setShowSuggestions(false)}
                                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 140, background: 'transparent' }}
                                            />
                                          )}
                                        </div>
                                      )}

                                      {/* 4. CONTACTS LIST GRID TABLE */}
                                      <div className="table-responsive" style={{ paddingLeft: '5rem', background: 'transparent', overflowX: 'auto' }}>
                                        <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                                          <thead>
                                            <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border)' }}>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Name</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Email</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Mobile</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>WhatsApp</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-secondary)', width: '60px', fontWeight: 600, border: 'none' }}>Tier</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', width: '50px', border: 'none' }}></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDeptContacts.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.7rem', borderBottom: '1px solid var(--border-light)' }}>
                                                  {searchQuery ? 'No matching contacts.' : 'No contacts.'}
                                                </td>
                                              </tr>
                                            ) : (
                                              filteredDeptContacts.map(contact => {
                                                const isEditing = editingContactId === contact.id;

                                                return (
                                                  <tr 
                                                    key={contact.id}
                                                    style={{
                                                      borderBottom: '1px solid var(--border-light)',
                                                      background: 'transparent'
                                                    }}
                                                  >
                                                    {/* NAME */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 500, border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editName}
                                                          onChange={(e) => setEditName(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                                        />
                                                      ) : (
                                                        contact.name
                                                      )}
                                                    </td>

                                                    {/* EMAIL */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="email" 
                                                          value={editEmail}
                                                          onChange={(e) => setEditEmail(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '180px' }}
                                                        />
                                                      ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                          <span>{contact.email || '—'}</span>
                                                          {contact.email && (
                                                            <button 
                                                              onClick={() => copyToClipboard([contact.email], contact.name)}
                                                              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                              title="Copy email"
                                                            >
                                                              <Copy size={9} />
                                                            </button>
                                                          )}
                                                        </div>
                                                      )}
                                                    </td>

                                                    {/* MOBILE */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editMobile}
                                                          onChange={(e) => setEditMobile(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                                        />
                                                      ) : (
                                                        contact.mobile ? (
                                                          <a href={`tel:${contact.mobile}`} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                                                            <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                                                            {contact.mobile}
                                                          </a>
                                                        ) : '—'
                                                      )}
                                                    </td>

                                                    {/* WHATSAPP */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editWhatsapp}
                                                          onChange={(e) => setEditWhatsapp(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                                        />
                                                      ) : (
                                                        contact.whatsapp ? (
                                                          <a 
                                                            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                                          >
                                                            <MessageCircle size={10} style={{ color: '#25D366' }} />
                                                            {contact.whatsapp}
                                                          </a>
                                                        ) : '—'
                                                      )}
                                                    </td>

                                                    {/* TIER */}
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', border: 'none' }}>
                                                      {isEditing ? (
                                                        <select 
                                                          value={editTier}
                                                          onChange={(e) => setEditTier(e.target.value as any)}
                                                          className="form-control"
                                                          style={{ padding: '2px 4px', fontSize: '0.7rem', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                                        >
                                                          <option value="L0">L0</option>
                                                          <option value="L1">L1</option>
                                                          <option value="L2">L2</option>
                                                        </select>
                                                      ) : (
                                                        <span 
                                                          className="badge" 
                                                          style={{ 
                                                            fontSize: '0.6rem', 
                                                            padding: '1px 5px',
                                                            fontWeight: 600,
                                                            borderRadius: '999px',
                                                            ...getTierBadgeStyle(contact.tier || 'L0') 
                                                          }}
                                                        >
                                                          {contact.tier || 'L0'}
                                                        </span>
                                                      )}
                                                    </td>

                                                    {/* ACTIONS */}
                                                    <td style={{ padding: '6px 10px', border: 'none' }}>
                                                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                        {isEditing ? (
                                                          <>
                                                            <button 
                                                              onClick={() => handleSaveEdit(contact.id)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }}
                                                              title="Save Changes"
                                                            >
                                                              <CheckCircle size={11} />
                                                            </button>
                                                            <button 
                                                              onClick={() => setEditingContactId(null)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                                              title="Cancel"
                                                            >
                                                              <X size={11} />
                                                            </button>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <button 
                                                              onClick={() => handleStartEdit(contact)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                                                              title="Edit Contact"
                                                            >
                                                              <Edit2 size={10} />
                                                            </button>
                                                            <button 
                                                              onClick={async () => {
                                                                if (await confirm(`Are you sure you want to remove contact "${contact.name}"?`, "Delete Contact")) {
                                                                  deleteDirectoryContact(contact.id);
                                                                }
                                                              }} 
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                                              title="Delete Contact"
                                                            >
                                                              <Trash2 size={10} />
                                                            </button>
                                                          </>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })()}
        </div>
      </TabContainer>
    </>
  );
};

