// A small Markdown subset for the Rich Text widget, turned into HTML that's safe to show:
// everything typed is escaped first, and only these become markup:
//   # / ## / ### headings, paragraphs (blank lines), - or * bullet lists, 1. numbered lists,
//   > quotes, **bold**, *italic*, `code`, [text](url) links (http, https, mailto, # and relative only)
// Hand-written, so the exported app needs no library for it.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** A link target that can't run code: http(s), mailto, an anchor or a relative address. */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return trimmed;
}

/** Inline markup of one (already escaped) line. */
function inline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, text: string, url: string) => {
      // The url was escaped with the rest; links need it as typed
      const target = safeUrl(url.replace(/&amp;/g, '&'));
      if (target === null) return text;
      const external = /^https?:/i.test(target);
      return `<a href="${escapeHtml(target)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    });
}

/** The HTML of a Markdown text (see above for what it understands). */
export function renderMarkdown(source: string): string {
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join('')}</${list.tag}>`);
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(inline(escapeHtml((bullet ?? numbered)![1])));
    } else if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inline(escapeHtml(quote[1]))}</blockquote>`);
    } else {
      flushList();
      paragraph.push(inline(escapeHtml(line.trim())));
    }
  }
  flushParagraph();
  flushList();
  return html.join('');
}
