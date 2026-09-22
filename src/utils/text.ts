/**
 * Normalizes description text to HTML.
 * If the string contains common HTML tags, it is treated as HTML and returned as-is.
 * Otherwise, it is treated as plain text and converted to clean HTML paragraphs,
 * with newlines converted to line breaks and URLs auto-hyperlinked.
 */
export function ensureHtmlDescription(desc: string | undefined | null): string {
  if (!desc) return '';
  
  // A basic check to see if the content is already HTML
  const hasHtml = /<[a-z][\s\S]*>/i.test(desc);
  if (hasHtml) {
    return desc;
  }
  
  // Escape plain text special characters to prevent HTML layout issues
  const escaped = desc
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Regex to match URLs. Should match http/https URLs that are not part of an existing tag
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linkified = escaped.replace(urlRegex, (url) => {
    // If the URL ends with a punctuation (like trailing dot or comma), remove it from the link but keep it in the text
    let cleanUrl = url;
    let trailingPunctuation = '';
    const match = url.match(/[.,;:?!]$/);
    if (match) {
      cleanUrl = url.slice(0, -1);
      trailingPunctuation = match[0];
    }
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailingPunctuation}`;
  });
  
  // Split into paragraphs by double newlines, and single newlines as line breaks
  const paragraphs = linkified.split(/\n\n+/);
  return paragraphs
    .map(para => {
      const lineBreaks = para.replace(/\n/g, '<br>');
      return `<p>${lineBreaks}</p>`;
    })
    .join('');
}

/**
 * Strips HTML tags from a string and decodes HTML entities for plain text displays.
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  
  // Replace paragraph ends and line breaks with newlines to preserve separation
  let str = html.replace(/<\/p>/gi, '\n');
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<li>/gi, '• ');
  str = str.replace(/<\/li>/gi, '\n');
  str = str.replace(/<\/h[1-6]>/gi, '\n');
  
  // Remove all other HTML tags
  str = str.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  str = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
    
  return str.trim();
}

/**
 * Parses basic Markdown syntax (headings, bold, lists) into HTML.
 */
export function parseMarkdownToHtml(markdown: string | undefined | null): string {
  if (!markdown) return '';

  let escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings (match lines starting with #, ##, ###)
  escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  escaped = escaped.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  escaped = escaped.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold (**text**)
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points (* text or - text)
  escaped = escaped.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  
  // Wrap consecutive list items in <ul> block
  escaped = escaped.replace(/((?:<li>.*?<\/li>[\s\r\n]*)+)/g, '<ul>$1</ul>');

  // Process paragraphs
  const paragraphs = escaped.split(/\n\n+/);
  return paragraphs
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      // If it's already an HTML block tag, don't wrap in p tag
      if (/^<\/?(?:h1|h2|h3|ul|li|p)/i.test(trimmed)) {
        // Just convert remaining line breaks inside list items or headings
        return trimmed.replace(/\n/g, '<br>');
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

/**
 * Converts HTML content (from RichTextEditor) to clean Markdown format suitable for ClickUp API.
 */
export function convertHtmlToMarkdown(html: string | undefined | null): string {
  if (!html) return '';
  const strInput = String(html).trim();
  if (!strInput) return '';

  // If there are no HTML tags, return as-is
  if (!/<[a-z][\s\S]*>/i.test(strInput)) {
    return strInput;
  }

  let text = strInput;

  // 1. Headers: <h1>, <h2>, etc.
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
  text = text.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '#### $1\n\n');

  // 2. Bold & Italic
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // 3. Code blocks and inline code
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 4. Links: <a href="url">label</a>
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => {
    const cleanLabel = label.replace(/<[^>]*>/g, '').trim();
    if (!cleanLabel || cleanLabel === href) {
      return href;
    }
    return `[${cleanLabel}](${href})`;
  });

  // 5. List items: <li>
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // 6. Remove container tags <ul>, <ol>
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // 7. Paragraphs and line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');

  // 8. Blockquotes & HR
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
  text = text.replace(/<hr\s*\/?>/gi, '---\n\n');

  // 9. Remove any remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // 10. Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'");

  // 11. Normalize excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
