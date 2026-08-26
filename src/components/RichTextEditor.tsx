import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Palette, Highlighter, Minus, Quote,
  List, ListOrdered, Link, Unlink, Maximize2, Eraser, X, Share2, Table,
  GripVertical, GripHorizontal, Trash2, Plus
} from 'lucide-react';
import { ensureHtmlDescription } from '../utils/text';

interface DocumentHeading {
  id: string;
  text: string;
  level: number;
}

interface RichTextEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  canEdit?: boolean;
  featureName?: string;
  itemId?: string;
}

const TEXT_COLORS = [
  { name: 'Black', value: '#0f172a' },
  { name: 'Dark Grey', value: '#334155' },
  { name: 'Grey', value: '#64748b' },
  { name: 'Light Grey', value: '#94a3b8' },
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Green', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Red Highlight', value: 'rgba(239, 68, 68, 0.3)' },
  { name: 'Orange Highlight', value: 'rgba(249, 115, 22, 0.3)' },
  { name: 'Yellow Highlight', value: 'rgba(245, 158, 11, 0.3)' },
  { name: 'Green Highlight', value: 'rgba(16, 185, 129, 0.3)' },
  { name: 'Blue Highlight', value: 'rgba(59, 130, 246, 0.3)' },
  { name: 'Purple Highlight', value: 'rgba(139, 92, 246, 0.3)' },
  { name: 'Pink Highlight', value: 'rgba(236, 72, 153, 0.3)' },
];

const FONTS = [
  { name: 'Default Font', value: 'WF Visual Sans Variable' },
  { name: 'Google Sans', value: 'Google Sans' },
  { name: 'Inter', value: 'Inter' },
  { name: 'Outfit', value: 'Outfit' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Courier New', value: 'Courier New' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Garamond', value: 'Garamond' },
  { name: 'Impact', value: 'Impact' },
  { name: 'Lora', value: 'Lora' },
  { name: 'Merriweather', value: 'Merriweather' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS' },
  { name: 'Verdana', value: 'Verdana' },
];


export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  canEdit = true,
  featureName = '',
  itemId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // States for active formatting highlights
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isBulletList, setIsBulletList] = useState(false);
  const [isNumberList, setIsNumberList] = useState(false);
  const [activeAlign, setActiveAlign] = useState('left');
  const [isQuote, setIsQuote] = useState(false);
  const [activeFormatBlock, setActiveFormatBlock] = useState('p');

  // Custom Color Picker popover states
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);

  const textColorRef = useRef<HTMLDivElement>(null);
  const highlightColorRef = useRef<HTMLDivElement>(null);

  // Headings state for Google Docs Outline Sidebar
  const [headings, setHeadings] = useState<DocumentHeading[]>([]);

  // Font family selector state
  const [activeFont, setActiveFont] = useState('Default Font');

  // Table operations popover state
  const [isInTable, setIsInTable] = useState(false);
  const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const tableDropdownRef = useRef<HTMLDivElement>(null);

  // Custom Table Creator Modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRowsInput, setTableRowsInput] = useState(3);
  const [tableColsInput, setTableColsInput] = useState(3);
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);
  const tableModalRef = useRef<HTMLDivElement>(null);

  // Dragged row and column states
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [rowToolbarStyle, setRowToolbarStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [colToolbarStyle, setColToolbarStyle] = useState<React.CSSProperties>({ display: 'none' });

  // Hover cell states for table handles
  const [hoveredCell, setHoveredCell] = useState<HTMLTableCellElement | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  // Normalize initial value (handle plain text conversion if needed)
  const normalizedHtml = ensureHtmlDescription(value);

  // Synced state initialization
  useEffect(() => {
    // Only overwrite if the user is not actively editing/focused
    if (!isFocusedRef.current && !isUpdatingRef.current) {
      const activeElement = document.activeElement;
      const isEditingThis = 
        activeElement && 
        (editorRef.current?.contains(activeElement) || canvasRef.current?.contains(activeElement));
      
      if (isEditingThis) return;

      if (editorRef.current && editorRef.current.innerHTML !== normalizedHtml) {
        editorRef.current.innerHTML = normalizedHtml;
      }
      if (canvasRef.current && canvasRef.current.innerHTML !== normalizedHtml) {
        canvasRef.current.innerHTML = normalizedHtml;
      }
    }
  }, [normalizedHtml]);

  // Click outside to close custom popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (textColorRef.current && !textColorRef.current.contains(target)) {
        setShowTextColorPicker(false);
      }
      if (highlightColorRef.current && !highlightColorRef.current.contains(target)) {
        setShowHighlightColorPicker(false);
      }
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(target)) {
        setShowTableDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hover events listener inside the editor to show row/col drag handles on hover
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLTableCellElement;
      
      if (cell && (editorRef.current?.contains(cell) || canvasRef.current?.contains(cell))) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setHoveredCell(cell);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const toElement = e.relatedTarget as HTMLElement;
      
      // If moving cursor to the control bars themselves, do NOT hide them
      if (toElement && toElement.closest('.table-floating-control-bar')) {
        return;
      }
      
      // Add a slight delay to allow smooth transition to the handles
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredCell(null);
      }, 150);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleToolbarMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleToolbarMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCell(null);
    }, 150);
  };

  // Update floating row and column toolbars positioning relative to hoveredCell or activeCell
  useEffect(() => {
    const targetCell = hoveredCell || activeCell;
    if (!targetCell) {
      setRowToolbarStyle({ display: 'none' });
      setColToolbarStyle({ display: 'none' });
      return;
    }
    
    const updatePositions = () => {
      const cellRect = targetCell.getBoundingClientRect();
      const row = targetCell.parentElement as HTMLTableRowElement;
      if (!row) return;
      const table = row.closest('table') as HTMLTableElement;
      if (!table) return;
      
      const tableRect = table.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      
      // Calculate row toolbar position: centered vertically on the left of the row
      const rowTop = window.scrollY + rowRect.top + (rowRect.height / 2) - 13;
      const rowLeft = window.scrollX + tableRect.left - 54; // Aligned correctly outside table border
      
      setRowToolbarStyle({
        position: 'absolute',
        top: `${rowTop}px`,
        left: `${rowLeft}px`,
        display: 'flex',
        alignItems: 'center',
        zIndex: 10005,
      });
      
      // Calculate col toolbar position: centered horizontally on top of the active column
      const colTop = window.scrollY + tableRect.top - 28;
      const colLeft = window.scrollX + cellRect.left + (cellRect.width / 2) - 33;
      
      setColToolbarStyle({
        position: 'absolute',
        top: `${colTop}px`,
        left: `${colLeft}px`,
        display: 'flex',
        alignItems: 'center',
        zIndex: 10005,
      });
    };
    
    updatePositions();
    
    // Add scroll/resize event listeners to keep positions synced
    const scrollContainer = document.querySelector('.google-doc-canvas-scroll-wrapper');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePositions);
    }
    window.addEventListener('resize', updatePositions);
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePositions);
      }
      window.removeEventListener('resize', updatePositions);
    };
  }, [activeCell, hoveredCell, isExpanded]);

  // Extract headings from DOM to build outline sidebar
  const extractHeadings = () => {
    const editor = canvasRef.current;
    if (!editor) return;

    const headingElements = editor.querySelectorAll('h1, h2, h3');
    const detectedHeadings: DocumentHeading[] = [];

    headingElements.forEach((el, index) => {
      // Assign a canvas-specific unique ID to avoid collision with hidden background editors
      const uniqueId = `canvas-heading-ref-${index}`;
      el.id = uniqueId;
      
      detectedHeadings.push({
        id: uniqueId,
        text: el.textContent || 'Untitled Heading',
        level: parseInt(el.tagName.replace('H', ''), 10),
      });
    });

    setHeadings(detectedHeadings);
  };

  // Sync content between small and expanded editor when toggling
  const handleToggleExpand = () => {
    if (!canEdit) return;
    const currentHtml = isExpanded 
      ? (canvasRef.current?.innerHTML || '') 
      : (editorRef.current?.innerHTML || '');
      
    // Save to parent before toggling to ensure state is flushed
    onChange(currentHtml);
    setIsExpanded(!isExpanded);
    
    // Defer updating to ensure the ref is mounted in DOM
    setTimeout(() => {
      const targetEditor = !isExpanded ? canvasRef.current : editorRef.current;
      if (targetEditor) {
        targetEditor.innerHTML = currentHtml;
        targetEditor.focus();
        updateActiveStates();
        if (!isExpanded) {
          extractHeadings();
        }
      }
    }, 50);
  };

  // Trigger heading updates when opening expanded modal
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        extractHeadings();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Safe handler to bubble changes up to parent
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    isUpdatingRef.current = true;
    const target = e.currentTarget;
    onChange(target.innerHTML);

    if (isExpanded) {
      extractHeadings();
    }

    // Reset updating flag shortly after
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    updateActiveStates();
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    isFocusedRef.current = false;
    if (!canEdit) return;
    const target = e.currentTarget;
    onChange(target.innerHTML);
  };

  // Updates active toolbar state highlights based on cursor selection
  const updateActiveStates = () => {
    if (typeof document === 'undefined') return;
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    setIsStrikethrough(document.queryCommandState('strikeThrough'));
    setIsBulletList(document.queryCommandState('insertUnorderedList'));
    setIsNumberList(document.queryCommandState('insertOrderedList'));
    
    if (document.queryCommandState('justifyCenter')) setActiveAlign('center');
    else if (document.queryCommandState('justifyRight')) setActiveAlign('right');
    else if (document.queryCommandState('justifyFull')) setActiveAlign('justify');
    else setActiveAlign('left');

    try {
      const val = document.queryCommandValue('formatBlock');
      setActiveFormatBlock(val || 'p');
      setIsQuote((val || '').toLowerCase().includes('blockquote'));
    } catch {
      setActiveFormatBlock('p');
      setIsQuote(false);
    }

    try {
      let font = document.queryCommandValue('fontName');
      if (font) {
        font = font.replace(/['"]/g, '').trim();
        if (font.includes(',')) {
          font = font.split(',')[0].trim();
        }
        
        const matched = FONTS.find(
          f => f.value.toLowerCase() === font.toLowerCase() || f.name.toLowerCase() === font.toLowerCase()
        );
        if (matched) {
          setActiveFont(matched.name);
        } else if (font.toLowerCase() === 'wf visual sans variable' || font.toLowerCase() === 'wf visual sans') {
          setActiveFont('Default Font');
        } else {
          setActiveFont(font);
        }
      } else {
        setActiveFont('Default Font');
      }
    } catch {
      setActiveFont('Default Font');
    }

    // Check if selection is inside a table cell (td/th)
    try {
      const selection = window.getSelection();
      const activeEditor = isExpanded ? canvasRef.current : editorRef.current;
      if (selection && selection.rangeCount > 0 && activeEditor) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.startContainer;
        let foundCell: HTMLTableCellElement | null = null;
        
        while (node && node !== activeEditor) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (tag === 'td' || tag === 'th') {
              foundCell = el as HTMLTableCellElement;
              break;
            }
          }
          node = node.parentNode;
        }
        
        setIsInTable(!!foundCell);
        setActiveCell(foundCell);
      } else {
        setIsInTable(false);
        setActiveCell(null);
      }
    } catch {
      setIsInTable(false);
      setActiveCell(null);
    }
  };

  // Helper to normalize the active block format tag
  const normalizedActiveBlock = () => {
    const block = activeFormatBlock.toLowerCase().trim();
    if (block.includes('h1') || block.includes('heading 1')) return 'h1';
    if (block.includes('h2') || block.includes('heading 2')) return 'h2';
    if (block.includes('h3') || block.includes('heading 3')) return 'h3';
    return 'p';
  };

  // Paste handler: parses pasted text, auto-linkifies URLs, and keeps lists/spacing clean
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    let finalHtml = '';
    
    if (html) {
      // Parse pasted HTML and linkify any raw text URLs inside text nodes (without corrupting layout tags)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Strip all style and link tags to prevent sheet-based formatting overrides
      const styles = doc.querySelectorAll('style, link');
      styles.forEach(s => s.remove());
      
      const walk = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const styleAttr = el.getAttribute('style');
          if (styleAttr && /(font-family|font\s*:)/i.test(styleAttr)) {
            const cleanedStyle = styleAttr
              .split(';')
              .map(p => p.trim())
              .filter(p => {
                if (!p) return false;
                const propName = p.split(':')[0].trim().toLowerCase();
                return propName !== 'font-family' && propName !== 'font';
              })
              .join(';');
            if (cleanedStyle) {
              el.setAttribute('style', cleanedStyle);
            } else {
              el.removeAttribute('style');
            }
          }
          if (el.tagName.toLowerCase() === 'font' && el.hasAttribute('face')) {
            el.removeAttribute('face');
          }
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = node.textContent || '';
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          if (urlRegex.test(textContent)) {
            const parent = node.parentNode;
            // Prevent wrapping existing anchor tags or nested links
            if (parent && parent.nodeName !== 'A') {
              const escaped = textContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              const linkified = escaped.replace(urlRegex, (url) => {
                let cleanUrl = url;
                let trailingPunctuation = '';
                const match = url.match(/[.,;:?!]$/);
                if (match) {
                  cleanUrl = url.slice(0, -1);
                  trailingPunctuation = match[0];
                }
                return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailingPunctuation}`;
              });
              
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = linkified;
              const fragment = document.createDocumentFragment();
              while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
              }
              parent.replaceChild(fragment, node);
            }
          }
        } else if (node.nodeName !== 'A') {
          // Recursively process child nodes, skipping existing anchor tags
          const children = Array.from(node.childNodes);
          children.forEach(walk);
        }
      };
      
      walk(doc.body);
      finalHtml = doc.body.innerHTML;
    } else if (text) {
      // Fallback: clipboard is plain text
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linkified = escaped.replace(urlRegex, (url) => {
        let cleanUrl = url;
        let trailingPunctuation = '';
        const match = url.match(/[.,;:?!]$/);
        if (match) {
          cleanUrl = url.slice(0, -1);
          trailingPunctuation = match[0];
        }
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailingPunctuation}`;
      });
      
      finalHtml = linkified.replace(/\n/g, '<br>');
    }
    
    if (!finalHtml) return;

    // Insert rich-formatted HTML at selection cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.deleteFromDocument();
      const range = selection.getRangeAt(0);
      const fragment = range.createContextualFragment(finalHtml);
      range.insertNode(fragment);
      
      // Move caret to after pasted content
      selection.collapseToEnd();
      
      // Trigger onChange
      const activeEditor = isExpanded ? canvasRef.current : editorRef.current;
      if (activeEditor) {
        onChange(activeEditor.innerHTML);
        if (isExpanded) {
          extractHeadings();
        }
      }
    }
  };

  const handleInsertTable = () => {
    if (!canEdit) return;
    setTableRowsInput(3);
    setTableColsInput(3);
    setHoveredRows(0);
    setHoveredCols(0);
    setShowTableModal(true);
  };

  const insertTableDimensions = (rows: number, cols: number) => {
    setShowTableModal(false);
    
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
      return;
    }
    
    const rCount = Math.min(20, rows);
    const cCount = Math.min(20, cols);

    // Generate table HTML
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0; border: 1px solid var(--border-light);">';
    tableHtml += '<tbody>';
    
    for (let r = 0; r < rCount; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cCount; c++) {
        if (r === 0) {
          tableHtml += '<th style="border: 1px solid var(--border-light); padding: 8px 12px; background-color: var(--background-alt); font-weight: 600; text-align: left; font-size: 0.825rem; min-width: 60px;">Header</th>';
        } else {
          tableHtml += '<td style="border: 1px solid var(--border-light); padding: 8px 12px; font-size: 0.825rem; min-width: 60px; vertical-align: top;">&nbsp;</td>';
        }
      }
      tableHtml += '</tr>';
    }
    
    tableHtml += '</tbody></table>';

    // Insert the table at cursor
    executeCommand('insertHTML', tableHtml);
  };

  const renderGridSelector = () => {
    const grid = [];
    for (let r = 1; r <= 8; r++) {
      const rowCells = [];
      for (let c = 1; c <= 8; c++) {
        const isSelected = r <= (hoveredRows || tableRowsInput) && c <= (hoveredCols || tableColsInput);
        rowCells.push(
          <div
            key={c}
            className={`grid-selector-cell ${isSelected ? 'selected' : ''}`}
            onMouseEnter={() => {
              setHoveredRows(r);
              setHoveredCols(c);
            }}
            onClick={() => {
              insertTableDimensions(r, c);
            }}
          />
        );
      }
      grid.push(
        <div key={r} className="grid-selector-row">
          {rowCells}
        </div>
      );
    }
    return (
      <div 
        className="grid-selector-container"
        onMouseLeave={() => {
          setHoveredRows(0);
          setHoveredCols(0);
        }}
      >
        {grid}
      </div>
    );
  };

  const triggerContentChange = () => {
    const activeEditor = isExpanded ? canvasRef.current : editorRef.current;
    if (activeEditor) {
      onChange(activeEditor.innerHTML);
      if (isExpanded) {
        extractHeadings();
      }
    }
    updateActiveStates();
  };

  const handleInsertRowAbove = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    const cellCount = row.cells.length;
    
    for (let i = 0; i < cellCount; i++) {
      const cellType = row.cells[i].tagName.toLowerCase();
      const newCell = document.createElement(cellType) as HTMLTableCellElement;
      newCell.style.border = '1px solid var(--border-light)';
      newCell.style.padding = '8px 12px';
      newCell.style.fontSize = '0.825rem';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '&nbsp;';
      if (cellType === 'th') {
        newCell.style.backgroundColor = 'var(--background-alt)';
        newCell.style.fontWeight = '600';
        newCell.style.textAlign = 'left';
      }
      newRow.appendChild(newCell);
    }
    
    tbody.insertBefore(newRow, row);
    triggerContentChange();
  };

  const handleInsertRowBelow = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    const cellCount = row.cells.length;
    
    for (let i = 0; i < cellCount; i++) {
      const newCell = document.createElement('td') as HTMLTableCellElement;
      newCell.style.border = '1px solid var(--border-light)';
      newCell.style.padding = '8px 12px';
      newCell.style.fontSize = '0.825rem';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '&nbsp;';
      newRow.appendChild(newCell);
    }
    
    tbody.insertBefore(newRow, row.nextSibling);
    triggerContentChange();
  };

  const handleInsertColumnLeft = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    
    const colIndex = activeCell.cellIndex;
    
    Array.from(table.rows).forEach((r) => {
      const isHeader = r.cells[colIndex]?.tagName.toLowerCase() === 'th' || r.rowIndex === 0;
      const cellType = isHeader ? 'th' : 'td';
      const newCell = document.createElement(cellType) as HTMLTableCellElement;
      newCell.style.border = '1px solid var(--border-light)';
      newCell.style.padding = '8px 12px';
      newCell.style.fontSize = '0.825rem';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '&nbsp;';
      if (isHeader) {
        newCell.style.backgroundColor = 'var(--background-alt)';
        newCell.style.fontWeight = '600';
        newCell.style.textAlign = 'left';
      }
      
      r.insertBefore(newCell, r.cells[colIndex]);
    });
    
    triggerContentChange();
  };

  const handleInsertColumnRight = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    
    const colIndex = activeCell.cellIndex;
    
    Array.from(table.rows).forEach((r) => {
      const isHeader = r.cells[colIndex]?.tagName.toLowerCase() === 'th' || r.rowIndex === 0;
      const cellType = isHeader ? 'th' : 'td';
      const newCell = document.createElement(cellType) as HTMLTableCellElement;
      newCell.style.border = '1px solid var(--border-light)';
      newCell.style.padding = '8px 12px';
      newCell.style.fontSize = '0.825rem';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '&nbsp;';
      if (isHeader) {
        newCell.style.backgroundColor = 'var(--background-alt)';
        newCell.style.fontWeight = '600';
        newCell.style.textAlign = 'left';
      }
      
      r.insertBefore(newCell, r.cells[colIndex].nextSibling);
    });
    
    triggerContentChange();
  };

  const handleDeleteRow = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    
    row.remove();
    if (table.rows.length === 0) {
      table.remove();
    }
    
    setActiveCell(null);
    setIsInTable(false);
    triggerContentChange();
  };

  const handleDeleteColumn = () => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    
    const colIndex = activeCell.cellIndex;
    
    Array.from(table.rows).forEach((r) => {
      if (r.cells[colIndex]) {
        r.cells[colIndex].remove();
      }
    });
    
    if (row.cells.length === 0) {
      table.remove();
      setActiveCell(null);
      setIsInTable(false);
    }
    
    triggerContentChange();
  };

  const handleDeleteTable = () => {
    if (!activeCell) return;
    const table = activeCell.closest('table');
    if (!table) return;
    
    table.remove();
    setActiveCell(null);
    setIsInTable(false);
    triggerContentChange();
  };

  // Drag and drop reordering handlers
  const handleRowDragStart = (e: React.DragEvent) => {
    if (!activeCell) return;
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    setDraggedRowIndex(row.rowIndex);
    e.dataTransfer.setData('text/plain', `row-${row.rowIndex}`);
  };

  const handleRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedRowIndex === null || !activeCell) return;
    
    const targetRow = activeCell.parentElement as HTMLTableRowElement;
    if (!targetRow) return;
    const table = targetRow.closest('table');
    if (!table) return;
    
    const targetIndex = targetRow.rowIndex;
    if (draggedRowIndex === targetIndex) return;
    
    const rows = Array.from(table.rows);
    const draggedRow = rows[draggedRowIndex];
    
    if (draggedRow) {
      const tbody = targetRow.parentNode as HTMLTableSectionElement;
      if (tbody) {
        isUpdatingRef.current = true;
        if (draggedRowIndex < targetIndex) {
          tbody.insertBefore(draggedRow, targetRow.nextSibling);
        } else {
          tbody.insertBefore(draggedRow, targetRow);
        }
        triggerContentChange();
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 300);
      }
    }
    
    setDraggedRowIndex(null);
  };

  const handleColDragStart = (e: React.DragEvent) => {
    if (!activeCell) return;
    setDraggedColIndex(activeCell.cellIndex);
    e.dataTransfer.setData('text/plain', `col-${activeCell.cellIndex}`);
  };

  const handleColDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedColIndex === null || !activeCell) return;
    
    const targetColIndex = activeCell.cellIndex;
    if (draggedColIndex === targetColIndex) return;
    
    const row = activeCell.parentElement as HTMLTableRowElement;
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    
    isUpdatingRef.current = true;
    // For each row, move the cell at draggedColIndex to targetColIndex
    Array.from(table.rows).forEach((r) => {
      const draggedCell = r.cells[draggedColIndex];
      const targetCell = r.cells[targetColIndex];
      
      if (draggedCell && targetCell) {
        if (draggedColIndex < targetColIndex) {
          r.insertBefore(draggedCell, targetCell.nextSibling);
        } else {
          r.insertBefore(draggedCell, targetCell);
        }
      }
    });
    
    triggerContentChange();
    setDraggedColIndex(null);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300);
  };

  // Run document commands (Bold, Italic, Headings, etc.)
  const executeCommand = (command: string, value: string = '') => {
    if (!canEdit) return;
    isUpdatingRef.current = true;
    
    // Focus the active editor first
    const activeEditor = isExpanded ? canvasRef.current : editorRef.current;
    if (activeEditor) {
      activeEditor.focus();
    }
    
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch (e) {}

    // Special handling for fontName to apply/remove font-family overrides inside the selection
    if (command === 'fontName') {
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && activeEditor) {
          for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            
            // Check if this is a "Select All" selection (exact matches or length-based threshold > 85% of text length)
            const isSelectAll = 
              (range.startContainer === activeEditor && range.endContainer === activeEditor && range.startOffset === 0) ||
              (selection.toString().trim() === activeEditor.innerText.trim()) ||
              (selection.toString().length > activeEditor.innerText.length * 0.85);

            // Get all elements inside the active editor
            const allElements = Array.from(activeEditor.querySelectorAll('*')) as HTMLElement[];
            
            const elementsToStyle = allElements.filter((el) => {
              if (isSelectAll) return true;
              try {
                // 1. Check if element contains selection start or end boundary
                if (el.contains(range.startContainer) || el.contains(range.endContainer)) {
                  return true;
                }
                // 2. Check if range intersects the element directly
                if (range.intersectsNode && range.intersectsNode(el)) {
                  return true;
                }
                // 3. Fallback: Compare boundary points to check if element is inside selection
                const elRange = document.createRange();
                elRange.selectNode(el);
                const startCompare = range.compareBoundaryPoints(Range.END_TO_START, elRange);
                const endCompare = range.compareBoundaryPoints(Range.START_TO_END, elRange);
                if (startCompare < 0 && endCompare > 0) {
                  return true;
                }
              } catch (e) {
                // Safe fallback in case range checks throw
              }
              return false;
            });

            elementsToStyle.forEach((el) => {
              // Always clean raw style string of both font-family and font shorthand
              const styleAttr = el.getAttribute('style');
              if (styleAttr && /(font-family|font\s*:)/i.test(styleAttr)) {
                const cleanedStyle = styleAttr
                  .split(';')
                  .map(p => p.trim())
                  .filter(p => {
                    if (!p) return false;
                    const propName = p.split(':')[0].trim().toLowerCase();
                    return propName !== 'font-family' && propName !== 'font';
                  })
                  .join(';');
                if (cleanedStyle) {
                  el.setAttribute('style', cleanedStyle);
                } else {
                  el.removeAttribute('style');
                }
              }

              if (value === 'WF Visual Sans Variable') {
                // Clear inline font-family to reset to default
                el.style.fontFamily = '';
              } else {
                // Explicitly set the font family on the elements directly to override any pasted styling
                el.style.fontFamily = value;
              }
              
              // Clear legacy font face attributes
              if (el.tagName.toLowerCase() === 'font' && el.hasAttribute('face')) {
                el.removeAttribute('face');
              }
            });
          }
        }
      } catch (err) {
        console.error('Error applying font styles directly:', err);
      }
    }
    
    document.execCommand(command, false, value);
    
    // Trigger change sync
    if (activeEditor) {
      onChange(activeEditor.innerHTML);
      if (isExpanded) {
        extractHeadings();
      }
    }

    // Refresh format highlights
    updateActiveStates();

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300);
  };

  const handleFormatBlock = (format: string) => {
    // Map to bracketed tag format for complete browser compatibility (Chrome/Safari formatBlock requirement)
    const tag = `<${format.toUpperCase()}>`;
    executeCommand('formatBlock', tag);
  };

  const handleAddLink = () => {
    if (!canEdit) return;
    const url = prompt('Enter the link URL (e.g. https://example.com):');
    if (!url) return;
    
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    executeCommand('createLink', formattedUrl);
  };

  const handleUnlink = () => {
    executeCommand('unlink');
  };

  const handleClearFormat = () => {
    executeCommand('removeFormat');
  };

  const handleShare = () => {
    if (!itemId) return;
    const publicLink = `${window.location.origin}?publicDoc=${itemId}`;
    navigator.clipboard.writeText(publicLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleQuoteBlock = () => {
    if (isQuote) {
      executeCommand('formatBlock', '<P>');
    } else {
      executeCommand('formatBlock', '<BLOCKQUOTE>');
    }
  };

  const handleHighlightColor = (color: string) => {
    try {
      executeCommand('hiliteColor', color);
    } catch {
      executeCommand('backColor', color);
    }
  };

  // Intercept Ctrl+A / Cmd+A inside contenteditable to select only editable text
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(e.currentTarget);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Smooth scroll to a heading inside the canvas
  const scrollToHeading = (id: string) => {
    const editor = canvasRef.current;
    if (!editor) return;

    // Find the element specifically inside the active canvas editor to avoid collision
    const el = editor.querySelector(`#${id}`) as HTMLElement;
    const scrollContainer = document.querySelector('.google-doc-canvas-scroll-wrapper');
    if (el && scrollContainer) {
      // Calculate position of heading relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + scrollContainer.scrollTop;
      
      // Scroll smoothly to the calculated offset
      scrollContainer.scrollTo({
        top: relativeTop - 20,
        behavior: 'smooth',
      });
    }
  };

  // Renders the toolbar items
  const renderToolbar = (isInlineToolbar: boolean = false) => {
    if (!canEdit) return null;
    return (
      <div className="rich-editor-toolbar">
        {/* Text styling selection */}
        <select 
          className="rich-editor-dropdown" 
          value={normalizedActiveBlock()}
          onChange={(e) => handleFormatBlock(e.target.value)}
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        {/* Font family selection dropdown */}
        <select 
          className="rich-editor-dropdown" 
          style={{ width: '130px', fontFamily: FONTS.find(f => f.name === activeFont)?.value || 'inherit' }}
          value={FONTS.some(f => f.name === activeFont) ? activeFont : 'Default Font'}
          onChange={(e) => {
            const font = FONTS.find(f => f.name === e.target.value);
            if (font) {
              executeCommand('fontName', font.value);
            }
          }}
          title="Font"
        >
          {FONTS.map((font) => (
            <option key={font.name} value={font.name} style={{ fontFamily: font.value }}>
              {font.name}
            </option>
          ))}
          {!FONTS.some(f => f.name === activeFont) && activeFont !== 'Default Font' && (
            <option value={activeFont} style={{ fontFamily: activeFont }}>
              {activeFont}
            </option>
          )}
        </select>
        
        <div className="rich-editor-separator" />

        {/* Basic typography formatting */}
        <button 
          type="button" 
          className={`rich-editor-btn ${isBold ? 'active' : ''}`}
          title="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('bold')}
        >
          <Bold size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${isItalic ? 'active' : ''}`}
          title="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('italic')}
        >
          <Italic size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${isUnderline ? 'active' : ''}`}
          title="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('underline')}
        >
          <Underline size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${isStrikethrough ? 'active' : ''}`}
          title="Strikethrough"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('strikeThrough')}
        >
          <Strikethrough size={14} />
        </button>

        <div className="rich-editor-separator" />

        {/* Custom Text Color Picker Popover (Google Docs style) */}
        <div className="rich-editor-color-wrapper" ref={textColorRef} title="Text Color">
          <button
            type="button"
            className="rich-editor-btn"
            style={{ width: '28px', height: '28px', border: 'none', background: 'none', padding: 0 }}
            onClick={() => {
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightColorPicker(false);
            }}
          >
            <Palette size={14} className="rich-editor-color-icon" />
          </button>
          
          {showTextColorPicker && (
            <div className="rich-editor-color-picker-popover" onMouseDown={(e) => e.preventDefault()}>
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="rich-editor-color-swatch"
                  style={{ backgroundColor: c.value }}
                  onClick={() => {
                    executeCommand('foreColor', c.value);
                    setShowTextColorPicker(false);
                  }}
                  title={c.name}
                />
              ))}
              <button
                type="button"
                className="rich-editor-color-swatch reset-swatch"
                onClick={() => {
                  executeCommand('foreColor', 'inherit');
                  setShowTextColorPicker(false);
                }}
              >
                Reset Color
              </button>
            </div>
          )}
        </div>

        {/* Custom Highlight Color Picker Popover (Google Docs style) */}
        <div className="rich-editor-color-wrapper" ref={highlightColorRef} title="Highlight Color">
          <button
            type="button"
            className="rich-editor-btn"
            style={{ width: '28px', height: '28px', border: 'none', background: 'none', padding: 0 }}
            onClick={() => {
              setShowHighlightColorPicker(!showHighlightColorPicker);
              setShowTextColorPicker(false);
            }}
          >
            <Highlighter size={14} className="rich-editor-color-icon" />
          </button>
          
          {showHighlightColorPicker && (
            <div className="rich-editor-color-picker-popover" onMouseDown={(e) => e.preventDefault()}>
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="rich-editor-color-swatch"
                  style={{ backgroundColor: c.value }}
                  onClick={() => {
                    handleHighlightColor(c.value);
                    setShowHighlightColorPicker(false);
                  }}
                  title={c.name}
                />
              ))}
              <button
                type="button"
                className="rich-editor-color-swatch reset-swatch"
                onClick={() => {
                  handleHighlightColor('transparent');
                  setShowHighlightColorPicker(false);
                }}
              >
                None
              </button>
            </div>
          )}
        </div>

        <div className="rich-editor-separator" />

        {/* Alignments */}
        <button 
          type="button" 
          className={`rich-editor-btn ${activeAlign === 'left' ? 'active' : ''}`}
          title="Align Left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyLeft')}
        >
          <AlignLeft size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${activeAlign === 'center' ? 'active' : ''}`}
          title="Align Center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyCenter')}
        >
          <AlignCenter size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${activeAlign === 'right' ? 'active' : ''}`}
          title="Align Right"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyRight')}
        >
          <AlignRight size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${activeAlign === 'justify' ? 'active' : ''}`}
          title="Justify"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyFull')}
        >
          <AlignJustify size={14} />
        </button>

        <div className="rich-editor-separator" />

        {/* Lists */}
        <button 
          type="button" 
          className={`rich-editor-btn ${isBulletList ? 'active' : ''}`}
          title="Bullet List"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertUnorderedList')}
        >
          <List size={14} />
        </button>
        <button 
          type="button" 
          className={`rich-editor-btn ${isNumberList ? 'active' : ''}`}
          title="Numbered List"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertOrderedList')}
        >
          <ListOrdered size={14} />
        </button>

        <div className="rich-editor-separator" />

        {/* Structural Blocks */}
        <button 
          type="button" 
          className={`rich-editor-btn ${isQuote ? 'active' : ''}`}
          title="Quote Block"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleQuoteBlock}
        >
          <Quote size={14} />
        </button>
        <button 
          type="button" 
          className="rich-editor-btn"
          title="Insert Horizontal Divider Line"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertHorizontalRule')}
        >
          <Minus size={14} />
        </button>
        <button 
          type="button" 
          className="rich-editor-btn"
          title="Insert Table"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertTable}
        >
          <Table size={14} />
        </button>

        {isInTable && (isInlineToolbar ? !isExpanded : isExpanded) && (
          <div className="rich-editor-color-wrapper" ref={tableDropdownRef} title="Table Layout" style={{ width: 'auto' }}>
            <button
              type="button"
              className="rich-editor-btn active"
              style={{ width: 'auto', padding: '0 8px', gap: '4px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
              onClick={() => setShowTableDropdown(!showTableDropdown)}
            >
              <Table size={14} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Table Layout</span>
            </button>
            
            {showTableDropdown && (
              <div className="rich-editor-color-picker-popover table-actions-popover" onMouseDown={(e) => e.preventDefault()} style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
                <button type="button" className="table-action-item" onClick={() => { handleInsertRowAbove(); setShowTableDropdown(false); }}>Row Above</button>
                <button type="button" className="table-action-item" onClick={() => { handleInsertRowBelow(); setShowTableDropdown(false); }}>Row Below</button>
                <button type="button" className="table-action-item" onClick={() => { handleInsertColumnLeft(); setShowTableDropdown(false); }}>Column Left</button>
                <button type="button" className="table-action-item" onClick={() => { handleInsertColumnRight(); setShowTableDropdown(false); }}>Column Right</button>
                <div className="table-action-separator" />
                <button type="button" className="table-action-item danger-item" onClick={() => { handleDeleteRow(); setShowTableDropdown(false); }}>Delete Row</button>
                <button type="button" className="table-action-item danger-item" onClick={() => { handleDeleteColumn(); setShowTableDropdown(false); }}>Delete Column</button>
                <button type="button" className="table-action-item danger-item" onClick={() => { handleDeleteTable(); setShowTableDropdown(false); }}>Delete Table</button>
              </div>
            )}
          </div>
        )}

        <div className="rich-editor-separator" />

        {/* Links */}
        <button 
          type="button" 
          className="rich-editor-btn"
          title="Insert Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleAddLink}
        >
          <Link size={14} />
        </button>
        <button 
          type="button" 
          className="rich-editor-btn"
          title="Remove Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUnlink}
        >
          <Unlink size={14} />
        </button>

        <div className="rich-editor-separator" />

        {/* Clear formatting */}
        <button 
          type="button" 
          className="rich-editor-btn"
          title="Clear Formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClearFormat}
        >
          <Eraser size={14} />
        </button>

        <div style={{ marginLeft: 'auto' }} />

        {/* Expand / Minimize (Only show when not expanded) */}
        {!isExpanded && (
          <button 
            type="button" 
            className="rich-editor-btn"
            title="Expand to Google Doc View"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleExpand}
          >
            <Maximize2 size={14} />
          </button>
        )}

        {/* Share Button (Only show when expanded and itemId is provided) */}
        {isExpanded && itemId && (
          <button 
            type="button" 
            className={`rich-editor-btn ${copiedLink ? 'success-copied' : ''}`}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '0 12px', 
              height: '28px', 
              width: 'auto',
              borderRadius: '4px',
              backgroundColor: copiedLink ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary)',
              color: copiedLink ? '#10b981' : '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginRight: '6px'
            }}
            onClick={handleShare}
            title="Copy Public Share Link"
          >
            {copiedLink ? (
              <span style={{ fontSize: '11px', color: '#10b981' }}>Copied!</span>
            ) : (
              <>
                <Share2 size={12} style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Share</span>
              </>
            )}
          </button>
        )}

        {/* Close Button (Only show when expanded on the toolbar to merge header space) */}
        {isExpanded && (
          <button 
            type="button" 
            className="rich-editor-btn"
            style={{ width: '28px', height: '28px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleToggleExpand}
            title="Close Canvas"
          >
            <X size={15} />
          </button>
        )}
      </div>
    );
  };

  const targetCell = hoveredCell || activeCell;

  return (
    <>
      {/* Standard In-line View */}
      <div className="rich-editor-container">
        {renderToolbar(true)}
        <div
          ref={editorRef}
          className="rich-editor-content"
          contentEditable={canEdit}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onClick={updateActiveStates}
          data-placeholder={placeholder}
          style={{ minHeight: '120px' }}
        />
      </div>

      {/* Full Canvas Modal (Google Docs style) - Rendered via Portal at body level to bypass drawer stacking contexts */}
      {isExpanded && createPortal(
        <div className="google-doc-modal">
          <div className="google-doc-modal-content">
            {/* Toolbar fixed at top of modal */}
            {renderToolbar(false)}

            {/* Google Doc sheet background */}
            <div className="google-doc-canvas-container">
              <div className="google-doc-layout">
                
                {/* Left Google Docs style outline sidebar */}
                <div className="google-doc-outline-sidebar">
                  <div className="google-doc-outline-title">Document Outline</div>
                  {headings.length > 0 ? (
                    <ul className="google-doc-outline-list">
                      {headings.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            className={`google-doc-outline-item level-${h.level}`}
                            onClick={() => scrollToHeading(h.id)}
                            title={h.text}
                          >
                            {h.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="google-doc-outline-empty">
                      Headings you add to the document will appear here.
                    </div>
                  )}
                </div>

                {/* Centered Document Sheet */}
                <div className="google-doc-canvas-scroll-wrapper">
                  <div className="google-doc-canvas">
                    {/* Feature Title Document Header */}
                    {featureName && (
                      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.75rem', userSelect: 'none' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Feature Document
                        </span>
                        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--text-primary)', border: 'none', background: 'none', outline: 'none' }}>
                          {featureName}
                        </h1>
                      </div>
                    )}
                    {/* Editable Area */}
                    <div
                      ref={canvasRef}
                      className="google-doc-canvas-editor-area"
                      contentEditable={canEdit}
                      onInput={handleInput}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                      onKeyUp={() => {
                        updateActiveStates();
                        extractHeadings();
                      }}
                      onMouseUp={updateActiveStates}
                      onClick={updateActiveStates}
                      data-placeholder={placeholder}
                      style={{ outline: 'none', minHeight: '600px' }}
                    />
                  </div>
                </div>

                {/* Right spacer to keep the document canvas perfectly centered in the layout */}
                <div className="google-doc-layout-spacer" />
                
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Row Toolbar */}
      {canEdit && targetCell && createPortal(
        <div 
          className="table-floating-control-bar row-control-bar" 
          style={rowToolbarStyle}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          {/* Drag Handle */}
          <div 
            className="table-drag-handle" 
            draggable 
            onDragStart={handleRowDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleRowDrop}
            title="Drag to reorder row"
          >
            <GripVertical size={12} />
          </div>
          {/* Delete Row */}
          <button 
            type="button" 
            className="table-control-btn danger" 
            onClick={handleDeleteRow}
            title="Delete Row"
          >
            <Trash2 size={12} />
          </button>
          {/* Insert Row Below */}
          <button 
            type="button" 
            className="table-control-btn" 
            onClick={handleInsertRowBelow}
            title="Add Row Below"
          >
            <Plus size={12} />
          </button>
        </div>,
        document.body
      )}

      {/* Floating Column Toolbar */}
      {canEdit && targetCell && createPortal(
        <div 
          className="table-floating-control-bar col-control-bar" 
          style={colToolbarStyle}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          {/* Drag Handle */}
          <div 
            className="table-drag-handle" 
            draggable 
            onDragStart={handleColDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleColDrop}
            title="Drag to reorder column"
          >
            <GripHorizontal size={12} />
          </div>
          {/* Delete Column */}
          <button 
            type="button" 
            className="table-control-btn danger" 
            onClick={handleDeleteColumn}
            title="Delete Column"
          >
            <Trash2 size={12} />
          </button>
          {/* Insert Column Right */}
          <button 
            type="button" 
            className="table-control-btn" 
            onClick={handleInsertColumnRight}
            title="Add Column Right"
          >
            <Plus size={12} />
          </button>
        </div>,
        document.body
      )}
      {/* Visual Table Modal Popup */}
      {showTableModal && createPortal(
        <div className="table-modal-overlay" onClick={() => setShowTableModal(false)}>
          <div 
            className="table-modal-card" 
            onClick={(e) => e.stopPropagation()}
            ref={tableModalRef}
          >
            <div className="table-modal-header">
              <h3>Insert Table</h3>
              <button type="button" className="table-modal-close-btn" onClick={() => setShowTableModal(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="table-modal-body">
              {/* Visual Grid Selector */}
              <div className="table-modal-grid-section">
                <span className="table-modal-section-label">Select dimensions visually:</span>
                {renderGridSelector()}
                <div className="grid-selector-dimensions-label">
                  {(hoveredRows || tableRowsInput)} &times; {(hoveredCols || tableColsInput)} Table
                </div>
              </div>
              
              <div className="table-modal-divider-vertical" />
              
              {/* Manual Dimension Inputs */}
              <div className="table-modal-manual-section">
                <span className="table-modal-section-label">Or enter manually:</span>
                <div className="table-modal-input-group">
                  <div className="table-modal-field">
                    <label>Rows</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={tableRowsInput}
                      onChange={(e) => setTableRowsInput(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="table-modal-field">
                    <label>Columns</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={tableColsInput}
                      onChange={(e) => setTableColsInput(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  className="table-modal-submit-btn"
                  onClick={() => insertTableDimensions(tableRowsInput, tableColsInput)}
                >
                  Create Table
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
