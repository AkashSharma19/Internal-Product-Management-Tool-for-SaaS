import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  GripVertical,
  Mail,
  Copy,
  MoveRight,
  Phone,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import type { ConfigProgram, DirectoryContact } from '../../types';
import './ContactsDirectoryTable.css';

const UNCATEGORIZED_ID = '__uncategorized__';

type ContactForm = {
  id?: string;
  parentId: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  categoryId: string;
};

type DraggedContact = { id: string; parentId: string } | null;

const emptyForm = (categoryId: string, parentId = ''): ContactForm => ({
  parentId,
  name: '',
  email: '',
  mobile: '',
  department: '',
  categoryId
});

const getInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map(part => part[0] || '')
  .join('')
  .toUpperCase() || 'C';

const resolveCategoryId = (
  contact: DirectoryContact,
  contacts: DirectoryContact[],
  programs: ConfigProgram[]
): string => {
  if (contact.categoryId) return contact.categoryId;
  if (contact.parentId) {
    const parent = contacts.find(item => item.id === contact.parentId);
    if (parent) return resolveCategoryId(parent, contacts, programs);
  }
  if (contact.programId) {
    const program = programs.find(item => item.id === contact.programId);
    if (program?.categoryId) return program.categoryId;
  }
  return UNCATEGORIZED_ID;
};

const contactMatchesQuery = (contact: DirectoryContact, query: string) =>
  [contact.name, contact.email, contact.mobile, contact.department]
    .some(value => (value || '').toLowerCase().includes(query));

const sortContacts = (contacts: DirectoryContact[]) => [...contacts].sort((a, b) => {
  const orderDifference = (a.order ?? 0) - (b.order ?? 0);
  return orderDifference || a.name.localeCompare(b.name);
});

export const ContactsDirectoryTable: React.FC = () => {
  const {
    directoryContacts = [],
    addDirectoryContact,
    updateDirectoryContact,
    deleteDirectoryContact,
    moveDirectoryContactGroup,
    categories = [],
    programs = [],
    canUserEdit,
    confirm,
    alert
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(new Set());
  const [contactForm, setContactForm] = useState<ContactForm | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [moveToCategoryId, setMoveToCategoryId] = useState('');
  const [draggedContact, setDraggedContact] = useState<DraggedContact>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropInsideTargetId, setDropInsideTargetId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [copiedCategoryEmails, setCopiedCategoryEmails] = useState(false);

  const categoryTabs = useMemo(() => {
    const configured = categories
      .filter(category => category.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(category => ({ id: category.id, name: category.name }));
    const hasUncategorized = directoryContacts.some(contact =>
      resolveCategoryId(contact, directoryContacts, programs) === UNCATEGORIZED_ID
    );
    if (hasUncategorized || configured.length === 0) {
      configured.push({ id: UNCATEGORIZED_ID, name: 'Uncategorized' });
    }
    return configured;
  }, [categories, directoryContacts, programs]);

  const activeCategoryId = categoryTabs.some(tab => tab.id === selectedCategoryId)
    ? selectedCategoryId
    : categoryTabs[0]?.id || UNCATEGORIZED_ID;
  const activeCategory = categoryTabs.find(tab => tab.id === activeCategoryId);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    directoryContacts.filter(contact => !contact.parentId).forEach(contact => {
      const categoryId = resolveCategoryId(contact, directoryContacts, programs);
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });
    return counts;
  }, [directoryContacts, programs]);

  const childrenByParent = useMemo(() => {
    const result: Record<string, DirectoryContact[]> = {};
    directoryContacts.filter(contact => contact.parentId).forEach(contact => {
      const parentId = contact.parentId || '';
      if (!result[parentId]) result[parentId] = [];
      result[parentId].push(contact);
    });
    Object.keys(result).forEach(parentId => { result[parentId] = sortContacts(result[parentId]); });
    return result;
  }, [directoryContacts]);

  const categoryOuterContacts = useMemo(() => sortContacts(directoryContacts.filter(contact =>
    !contact.parentId && resolveCategoryId(contact, directoryContacts, programs) === activeCategoryId
  )), [directoryContacts, programs, activeCategoryId]);

  const visibleContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryOuterContacts;
    return categoryOuterContacts.filter(contact =>
      contactMatchesQuery(contact, query)
      || (childrenByParent[contact.id] || []).some(child => contactMatchesQuery(child, query))
    );
  }, [categoryOuterContacts, childrenByParent, searchQuery]);

  const departmentSuggestions = useMemo(() => Array.from(new Set(
    directoryContacts
      .filter(contact => resolveCategoryId(contact, directoryContacts, programs) === (contactForm?.categoryId || activeCategoryId))
      .map(contact => contact.department?.trim())
      .filter((value): value is string => Boolean(value))
  )).sort(), [directoryContacts, programs, contactForm?.categoryId, activeCategoryId]);

  const openAdd = (parentId = '') => {
    setFormError('');
    setContactForm(emptyForm(activeCategoryId, parentId));
  };

  const openEdit = (contact: DirectoryContact) => {
    setFormError('');
    setContactForm({
      id: contact.id,
      parentId: contact.parentId || '',
      name: contact.name || '',
      email: contact.email || '',
      mobile: contact.mobile || '',
      department: contact.department || '',
      categoryId: resolveCategoryId(contact, directoryContacts, programs)
    });
  };

  const saveContact = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactForm) return;
    if (!contactForm.name.trim()) {
      setFormError('Name is required.');
      return;
    }

    const siblings = directoryContacts.filter(contact =>
      (contact.parentId || '') === contactForm.parentId
      && resolveCategoryId(contact, directoryContacts, programs) === contactForm.categoryId
    );
    const values = {
      name: contactForm.name.trim(),
      email: contactForm.email.trim(),
      mobile: contactForm.mobile.trim(),
      department: contactForm.department.trim(),
      categoryId: contactForm.categoryId,
      parentId: contactForm.parentId
    };

    if (contactForm.id) {
      updateDirectoryContact(contactForm.id, values);
    } else {
      addDirectoryContact({
        id: `dir-contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...values,
        order: siblings.length,
        whatsapp: '',
        tier: 'L0',
        programId: '',
        cohortId: ''
      });
      if (contactForm.parentId) {
        setExpandedContactIds(previous => new Set(previous).add(contactForm.parentId));
      }
    }
    setContactForm(null);
    setFormError('');
  };

  const removeContact = async (contact: DirectoryContact) => {
    const childCount = (childrenByParent[contact.id] || []).length;
    const accepted = await confirm(
      childCount
        ? `Delete ${contact.name} and its ${childCount} nested contact${childCount === 1 ? '' : 's'}?`
        : `Delete ${contact.name} from the contacts directory?`,
      'Delete Contact', 'Delete', 'Cancel', 'danger'
    );
    if (!accepted) return;
    (childrenByParent[contact.id] || []).forEach(child => deleteDirectoryContact(child.id));
    deleteDirectoryContact(contact.id);
  };

  const toggleExpanded = (contactId: string) => {
    setExpandedContactIds(previous => {
      const next = new Set(previous);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const reorderContacts = (dragged: DraggedContact, targetId: string, parentId: string) => {
    if (!dragged || dragged.id === targetId || dragged.parentId !== parentId || searchQuery.trim()) return;
    const scope = parentId
      ? childrenByParent[parentId] || []
      : categoryOuterContacts;
    const sourceIndex = scope.findIndex(contact => contact.id === dragged.id);
    const targetIndex = scope.findIndex(contact => contact.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...scope];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    reordered.forEach((contact, order) => {
      if (contact.order !== order) updateDirectoryContact(contact.id, { order });
    });
    setDraggedContact(null);
    setDropTargetId(null);
    setDropInsideTargetId(null);
  };

  const moveOuterContactInside = async (targetParent: DirectoryContact) => {
    if (!draggedContact || draggedContact.parentId || draggedContact.id === targetParent.id || searchQuery.trim()) return;
    const source = directoryContacts.find(contact => contact.id === draggedContact.id && !contact.parentId);
    if (!source) return;

    const sourceChildren = childrenByParent[source.id] || [];
    if (sourceChildren.length > 0) {
      const accepted = await confirm(
        `${source.name} already has ${sourceChildren.length} related contact${sourceChildren.length === 1 ? '' : 's'}. Move all of them under ${targetParent.name} as related contacts too?`,
        'Move Contact Group',
        'Move All',
        'Cancel',
        'warning'
      );
      if (!accepted) {
        setDropInsideTargetId(null);
        setDraggedContact(null);
        return;
      }
    }

    const targetCategoryId = resolveCategoryId(targetParent, directoryContacts, programs);
    const moved = await moveDirectoryContactGroup(source.id, targetParent.id, targetCategoryId);
    if (!moved) {
      await alert('The contact move could not finish. Please refresh the directory before trying again.', 'Move Failed', 'OK', 'danger');
      setDraggedContact(null);
      setDropInsideTargetId(null);
      return;
    }

    setSelectedContactIds(previous => {
      const next = new Set(previous);
      next.delete(source.id);
      return next;
    });
    setExpandedContactIds(previous => new Set(previous).add(targetParent.id));
    setDraggedContact(null);
    setDropTargetId(null);
    setDropInsideTargetId(null);
  };

  const dragProps = (contact: DirectoryContact, parentId = '') => ({
    draggable: canUserEdit && !searchQuery.trim(),
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = 'move';
      setDraggedContact({ id: contact.id, parentId });
    },
    onDragOver: (event: React.DragEvent) => {
      if (draggedContact?.parentId !== parentId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropTargetId(contact.id);
      setDropInsideTargetId(null);
    },
    onDragLeave: () => setDropTargetId(current => current === contact.id ? null : current),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      reorderContacts(draggedContact, contact.id, parentId);
    },
    onDragEnd: () => {
      setDraggedContact(null);
      setDropTargetId(null);
      setDropInsideTargetId(null);
    }
  });

  const selectableContactIds = visibleContacts.map(contact => contact.id);
  const allVisibleSelected = selectableContactIds.length > 0
    && selectableContactIds.every(id => selectedContactIds.has(id));

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(previous => {
      const next = new Set(previous);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleAllVisibleContacts = () => {
    setSelectedContactIds(previous => {
      const next = new Set(previous);
      if (allVisibleSelected) selectableContactIds.forEach(id => next.delete(id));
      else selectableContactIds.forEach(id => next.add(id));
      return next;
    });
  };

  const moveSelectedContacts = () => {
    if (!moveToCategoryId || selectedContactIds.size === 0) return;
    const selectedParents = directoryContacts.filter(contact =>
      selectedContactIds.has(contact.id)
      && !contact.parentId
      && resolveCategoryId(contact, directoryContacts, programs) === UNCATEGORIZED_ID
    );
    selectedParents.forEach(parent => {
      updateDirectoryContact(parent.id, { categoryId: moveToCategoryId, programId: '', cohortId: '' });
      (childrenByParent[parent.id] || []).forEach(child =>
        updateDirectoryContact(child.id, { categoryId: moveToCategoryId, programId: '', cohortId: '' })
      );
    });
    setSelectedContactIds(new Set());
    setSelectedCategoryId(moveToCategoryId);
    setMoveToCategoryId('');
    setSearchQuery('');
  };

  const destinationCategories = categoryTabs.filter(tab => tab.id !== UNCATEGORIZED_ID);
  const showMoveControls = canUserEdit && activeCategoryId === UNCATEGORIZED_ID;

  const categoryEmails = useMemo(() => {
    const seen = new Set<string>();
    return directoryContacts
      .filter(contact => resolveCategoryId(contact, directoryContacts, programs) === activeCategoryId)
      .map(contact => contact.email?.trim() || '')
      .filter(email => {
        if (!email) return false;
        const normalized = email.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }, [directoryContacts, programs, activeCategoryId]);

  const writeToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) throw new Error('Clipboard unavailable');
  };

  const copyContactEmail = async (contact: DirectoryContact) => {
    if (!contact.email?.trim()) return;
    try {
      await writeToClipboard(contact.email.trim());
      setCopiedEmailId(contact.id);
      window.setTimeout(() => setCopiedEmailId(current => current === contact.id ? null : current), 1800);
    } catch {
      await alert('Could not copy this email address.', 'Copy Failed', 'OK', 'danger');
    }
  };

  const copyAllCategoryEmails = async () => {
    if (categoryEmails.length === 0) {
      await alert('There are no email addresses in this category.', 'No Emails', 'OK', 'warning');
      return;
    }
    try {
      await writeToClipboard(categoryEmails.join(', '));
      setCopiedCategoryEmails(true);
      window.setTimeout(() => setCopiedCategoryEmails(false), 2000);
    } catch {
      await alert('Could not copy the category email addresses.', 'Copy Failed', 'OK', 'danger');
    }
  };

  const ContactCells = ({ contact, nested = false }: { contact: DirectoryContact; nested?: boolean }) => (
    <>
      <td>
        <div className="contacts-name-cell">
          <span className={`contacts-avatar ${nested ? 'nested' : ''}`}>{getInitials(contact.name)}</span>
          <span>{contact.name}</span>
        </div>
      </td>
      <td>{contact.email ? <div className="contacts-email-cell"><a className="contacts-link" href={`mailto:${contact.email}`}><Mail size={12} /> {contact.email}</a><button type="button" className={`contacts-copy-email ${copiedEmailId === contact.id ? 'copied' : ''}`} title={copiedEmailId === contact.id ? 'Copied!' : 'Copy email'} aria-label={`Copy ${contact.email}`} onClick={event => { event.stopPropagation(); void copyContactEmail(contact); }}>{copiedEmailId === contact.id ? <Check size={12} /> : <Copy size={12} />}</button></div> : '—'}</td>
      <td>{contact.mobile ? <a className="contacts-link" href={`tel:${contact.mobile}`}><Phone size={12} /> {contact.mobile}</a> : '—'}</td>
      <td>{contact.department ? <span className="contacts-department-badge">{contact.department}</span> : '—'}</td>
    </>
  );

  return (
    <TabContainer
      title="Contacts Directory"
      searchQuery={searchQuery}
      setSearchQuery={(value) => {
        setSearchQuery(value);
        setSelectedContactIds(new Set());
      }}
      searchPlaceholder="Search name, email, mobile or department..."
      onAddClick={() => openAdd()}
      addLabel="Add Contact"
    >
      <div className="contacts-directory-body">
        <div className="contacts-category-tabs" role="tablist" aria-label="Contact categories">
          {categoryTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryId === tab.id}
              className={`contacts-category-tab ${activeCategoryId === tab.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategoryId(tab.id);
                setSearchQuery('');
                setSelectedContactIds(new Set());
                setMoveToCategoryId('');
                setCopiedCategoryEmails(false);
              }}
            >
              {tab.name}<span className="contacts-category-count">{categoryCounts[tab.id] || 0}</span>
            </button>
          ))}
          <div className="contacts-category-copy-action">
            <button
              type="button"
              className={`btn btn-secondary btn-sm ${copiedCategoryEmails ? 'copied' : ''}`}
              onClick={() => void copyAllCategoryEmails()}
              title={`Copy ${categoryEmails.length} unique email${categoryEmails.length === 1 ? '' : 's'} from ${activeCategory?.name || 'this category'}`}
            >
              {copiedCategoryEmails ? <Check size={13} /> : <Copy size={13} />}
              {copiedCategoryEmails ? 'Copied!' : `Copy All Emails (${categoryEmails.length})`}
            </button>
          </div>
        </div>

        {showMoveControls && (
          <div className="contacts-bulk-bar">
            <div className="contacts-bulk-summary">
              <strong>{selectedContactIds.size}</strong> selected
              {selectedContactIds.size > 0 && <button type="button" onClick={() => setSelectedContactIds(new Set())}>Clear selection</button>}
            </div>
            <div className="contacts-bulk-move">
              <span>Move to</span>
              <select value={moveToCategoryId} onChange={event => setMoveToCategoryId(event.target.value)}>
                <option value="">Select category...</option>
                {destinationCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <button type="button" className="btn btn-primary btn-sm" disabled={!moveToCategoryId || selectedContactIds.size === 0} onClick={moveSelectedContacts}>
                <MoveRight size={13} /> Move Selected
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive contacts-table-wrap">
          <table className="grid-table contacts-accordion-table">
            <thead><tr>
              <th className="contacts-drag-column"></th>
              {showMoveControls && <th className="contacts-select-column"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisibleContacts} aria-label="Select all visible uncategorized contacts" /></th>}
              <th style={{ minWidth: 220 }}>Name</th>
              <th style={{ minWidth: 240 }}>Email</th>
              <th style={{ minWidth: 160 }}>Mobile</th>
              <th style={{ minWidth: 180 }}>Department</th>
              <th style={{ width: 90 }}></th>
            </tr></thead>
            <tbody>
              {visibleContacts.length === 0 ? (
                <tr><td colSpan={showMoveControls ? 7 : 6} className="contacts-empty"><div className="contacts-empty-content"><UserRound size={32} /><strong>{searchQuery ? 'No matching contacts' : `No contacts in ${activeCategory?.name || 'this category'}`}</strong><span>{searchQuery ? 'Try a different search.' : 'Use Add Contact to create the first contact.'}</span></div></td></tr>
              ) : visibleContacts.map(contact => {
                const children = childrenByParent[contact.id] || [];
                const normalizedQuery = searchQuery.trim().toLowerCase();
                const parentMatchesSearch = normalizedQuery ? contactMatchesQuery(contact, normalizedQuery) : false;
                const displayedChildren = normalizedQuery && !parentMatchesSearch
                  ? children.filter(child => contactMatchesQuery(child, normalizedQuery))
                  : children;
                const expanded = expandedContactIds.has(contact.id) || (normalizedQuery.length > 0 && displayedChildren.length > 0);
                return <React.Fragment key={contact.id}>
                  <tr
                    {...dragProps(contact)}
                    className={`${selectedContactIds.has(contact.id) ? 'contacts-row-selected ' : ''}${dropTargetId === contact.id ? 'contacts-drop-target' : ''}`}
                    onClick={() => toggleExpanded(contact.id)}
                  >
                    <td className="contacts-drag-column"><GripVertical size={14} /><button type="button" aria-label={expanded ? 'Collapse contact' : 'Expand contact'}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
                    {showMoveControls && <td className="contacts-select-column" onClick={event => event.stopPropagation()}><input type="checkbox" checked={selectedContactIds.has(contact.id)} onChange={() => toggleContactSelection(contact.id)} aria-label={`Select ${contact.name}`} /></td>}
                    <ContactCells contact={contact} />
                    <td onClick={event => event.stopPropagation()}><div className="contacts-actions">{canUserEdit && <><button className="contacts-icon-btn" type="button" title="Add nested contact" onClick={() => openAdd(contact.id)}><Plus size={13} /></button><button className="contacts-icon-btn" type="button" title="Edit contact" onClick={() => openEdit(contact)}><Edit2 size={13} /></button><button className="contacts-icon-btn danger" type="button" title="Delete contact" onClick={() => removeContact(contact)}><Trash2 size={13} /></button></>}</div></td>
                  </tr>
                  {expanded && <tr className="contacts-expanded-row"><td colSpan={showMoveControls ? 7 : 6}>
                    <div
                      className={`contacts-nested-card ${dropInsideTargetId === contact.id ? 'contacts-drop-inside-active' : ''}`}
                      onDragOver={event => {
                        if (!draggedContact || draggedContact.parentId || draggedContact.id === contact.id || searchQuery.trim()) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = 'move';
                        setDropInsideTargetId(contact.id);
                        setDropTargetId(null);
                      }}
                      onDragLeave={event => {
                        const nextTarget = event.relatedTarget as Node | null;
                        if (!nextTarget || !event.currentTarget.contains(nextTarget)) setDropInsideTargetId(null);
                      }}
                      onDrop={event => {
                        if (!draggedContact || draggedContact.parentId || draggedContact.id === contact.id) return;
                        event.preventDefault();
                        event.stopPropagation();
                        void moveOuterContactInside(contact);
                      }}
                    >
                      {draggedContact && !draggedContact.parentId && draggedContact.id !== contact.id && (
                        <div className="contacts-drop-inside-hint"><MoveRight size={15} /> Drop here to move contact inside {contact.name}</div>
                      )}
                      <div className="contacts-nested-header"><div><UsersRound size={15} /><span><strong>Related Contacts</strong><small>{children.length} contact{children.length === 1 ? '' : 's'} under {contact.name}</small></span></div>{canUserEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAdd(contact.id)}><Plus size={12} /> Add Contact</button>}</div>
                      {displayedChildren.length === 0 ? <div className="contacts-nested-empty">No related contacts added yet.</div> : <div className="table-responsive contacts-nested-table-wrap"><table className="grid-table contacts-nested-table"><thead><tr><th className="contacts-drag-column"></th><th>Name</th><th>Email</th><th>Mobile</th><th>Department</th><th style={{ width: 70 }}></th></tr></thead><tbody>{displayedChildren.map(child => <tr key={child.id} {...dragProps(child, contact.id)} className={dropTargetId === child.id ? 'contacts-drop-target' : ''}><td className="contacts-drag-column"><GripVertical size={14} /></td><ContactCells contact={child} nested /><td><div className="contacts-actions">{canUserEdit && <><button className="contacts-icon-btn" type="button" title="Edit contact" onClick={() => openEdit(child)}><Edit2 size={13} /></button><button className="contacts-icon-btn danger" type="button" title="Delete contact" onClick={() => removeContact(child)}><Trash2 size={13} /></button></>}</div></td></tr>)}</tbody></table></div>}
                    </div>
                  </td></tr>}
                </React.Fragment>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {contactForm && (
        <div className="contacts-modal-overlay" onClick={() => setContactForm(null)}>
          <div className="contacts-modal" onClick={event => event.stopPropagation()}>
            <div className="contacts-modal-header"><div><h3>{contactForm.id ? 'Edit Contact' : contactForm.parentId ? 'Add Related Contact' : 'Add Contact'}</h3><p>{contactForm.parentId ? `Under ${directoryContacts.find(contact => contact.id === contactForm.parentId)?.name || 'contact'} • ` : ''}{activeCategory?.name || 'Uncategorized'}</p></div><button type="button" className="contacts-modal-close" onClick={() => setContactForm(null)}><X size={18} /></button></div>
            <form onSubmit={saveContact}>
              <div className="contacts-form">
                {formError && <div className="contacts-form-error">{formError}</div>}
                <div className="contacts-field"><label>Name *</label><input autoFocus value={contactForm.name} onChange={event => setContactForm({ ...contactForm, name: event.target.value })} placeholder="Contact name" /></div>
                <div className="contacts-field"><label>Email</label><input type="email" value={contactForm.email} onChange={event => setContactForm({ ...contactForm, email: event.target.value })} placeholder="name@example.com" /></div>
                <div className="contacts-field"><label>Mobile</label><input type="tel" value={contactForm.mobile} onChange={event => setContactForm({ ...contactForm, mobile: event.target.value })} placeholder="Mobile number" /></div>
                <div className="contacts-field"><label>Department</label><input list="contact-departments" value={contactForm.department} onChange={event => setContactForm({ ...contactForm, department: event.target.value })} placeholder="e.g. Operations" /><datalist id="contact-departments">{departmentSuggestions.map(department => <option key={department} value={department} />)}</datalist></div>
              </div>
              <div className="contacts-modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setContactForm(null)}>Cancel</button><button type="submit" className="btn btn-primary">{contactForm.id ? 'Save Changes' : 'Add Contact'}</button></div>
            </form>
          </div>
        </div>
      )}
    </TabContainer>
  );
};
