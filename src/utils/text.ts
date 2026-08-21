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
