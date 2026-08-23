import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Palette, Highlighter, Minus, Quote,
  List, ListOrdered, Link, Unlink, Maximize2, Eraser, X, Share2
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

  // Normalize initial value (handle plain text conversion if needed)
  const normalizedHtml = ensureHtmlDescription(value);

  // Synced state initialization
  useEffect(() => {
    // Only overwrite if the user is not actively editing/focused
    if (!isFocusedRef.current && !isUpdatingRef.current) {
      if (editorRef.current && editorRef.current.innerHTML !== normalizedHtml) {
        editorRef.current.innerHTML = normalizedHtml;
      }
      if (canvasRef.current && canvasRef.current.innerHTML !== normalizedHtml) {
        canvasRef.current.innerHTML = normalizedHtml;
      }
    }
  }, [normalizedHtml]);

  // Click outside to close custom color pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (textColorRef.current && !textColorRef.current.contains(target)) {
        setShowTextColorPicker(false);
      }
      if (highlightColorRef.current && !highlightColorRef.current.contains(target)) {
        setShowHighlightColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      const walk = (node: Node) => {
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

  // Run document commands (Bold, Italic, Headings, etc.)
  const executeCommand = (command: string, value: string = '') => {
    if (!canEdit) return;
    
    // Focus the active editor first
    const activeEditor = isExpanded ? canvasRef.current : editorRef.current;
    if (activeEditor) {
      activeEditor.focus();
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
  const renderToolbar = () => {
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

  return (
    <>
      {/* Standard In-line View */}
      <div className="rich-editor-container">
        {renderToolbar()}
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
            {renderToolbar()}

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
    </>
  );
};
