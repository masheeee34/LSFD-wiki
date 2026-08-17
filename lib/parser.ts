export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'link'; slug: string; label: string }
  | { type: 'definition'; explanation: string; word: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

export type BlockToken =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'ordered_list'; items: InlineToken[][] }
  | { type: 'unordered_list'; items: InlineToken[][] }
  | { type: 'table'; headers: InlineToken[][]; rows: InlineToken[][][] }
  | { type: 'callout'; variant: 'critical' | 'urgent' | 'info'; tokens: InlineToken[] }
  | { type: 'image'; alt: string; url: string }
  | { type: 'hr' }
  | { type: 'linebreak' };

export type ParsedToken = InlineToken | BlockToken;

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  const patterns: Array<{ re: RegExp; handler: (m: RegExpExecArray) => InlineToken }> = [
    {
      re: /\[\[link:([^|\]]+)(?:\|([^\]]+))?\]\]/,
      handler: (m) => ({
        type: 'link',
        slug: m[1].trim(),
        label: m[2] ? m[2].trim() : m[1].trim(),
      }),
    },
    {
      re: /\[\[def:([^|\]]+)\|([^\]]+)\]\]/,
      handler: (m) => ({ type: 'definition', explanation: m[1].trim(), word: m[2].trim() }),
    },
    {
      re: /\*\*(.+?)\*\*/,
      handler: (m) => ({ type: 'bold', value: m[1] }),
    },
    {
      re: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/,
      handler: (m) => ({ type: 'italic', value: m[1] }),
    },
    {
      re: /`([^`]+)`/,
      handler: (m) => ({ type: 'code', value: m[1] }),
    },
  ];

  while (remaining.length > 0) {
    let earliest: { index: number; length: number; token: InlineToken } | null = null;

    for (const { re, handler } of patterns) {
      const match = re.exec(remaining);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = { index: match.index, length: match[0].length, token: handler(match) };
      }
    }

    if (!earliest) {
      tokens.push({ type: 'text', value: remaining });
      break;
    }

    if (earliest.index > 0) {
      tokens.push({ type: 'text', value: remaining.slice(0, earliest.index) });
    }
    tokens.push(earliest.token);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return tokens;
}

// Backward compatibility alias
export const tokenizeLine = tokenizeInline;

export function parseMarkdownBlocks(markdown: string): BlockToken[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const blocks: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty lines
    if (trimmed === '') {
      blocks.push({ type: 'linebreak' });
      i++;
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings: # H1, ## H2, ### H3, #### H4
    const headingMatch = rawLine.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({
        type: 'heading',
        level,
        tokens: tokenizeInline(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // Standalone Image: ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        alt: imageMatch[1].trim() || 'Image illustrative',
        url: imageMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Callout block: > [!CRITICAL] or > [!URGENT] or > [!INFO] or simple quote > text
    if (trimmed.startsWith('>')) {
      let calloutText = trimmed.replace(/^>\s*/, '');
      let variant: 'critical' | 'urgent' | 'info' = 'info';

      if (/^\[!(CRITICAL|URGENT|DANGER|ATTENTION)\]/i.test(calloutText)) {
        variant = 'critical';
        calloutText = calloutText.replace(/^\[!(CRITICAL|URGENT|DANGER|ATTENTION)\]\s*/i, '');
      } else if (/^\[!(WARNING|AVERTISSEMENT|URGENT)\]/i.test(calloutText)) {
        variant = 'urgent';
        calloutText = calloutText.replace(/^\[!(WARNING|AVERTISSEMENT|URGENT)\]\s*/i, '');
      } else if (/^\[!(NOTE|INFO|IMPORTANT)\]/i.test(calloutText)) {
        variant = 'info';
        calloutText = calloutText.replace(/^\[!(NOTE|INFO|IMPORTANT)\]\s*/i, '');
      }

      blocks.push({
        type: 'callout',
        variant,
        tokens: tokenizeInline(calloutText),
      });
      i++;
      continue;
    }

    // Ordered List (1. item, 1 . item, 1) item)
    const orderedMatch = rawLine.match(/^\s*(\d+)\s*[\.\)]\s*(.+)$/);
    if (orderedMatch) {
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\s*(\d+)\s*[\.\)]\s*(.+)$/);
        if (!itemMatch) break;
        items.push(tokenizeInline(itemMatch[2].trim()));
        i++;
      }
      blocks.push({ type: 'ordered_list', items });
      continue;
    }

    // Unordered List (- item, * item, • item)
    const unorderedMatch = rawLine.match(/^\s*[-*•]\s+(.+)$/);
    if (unorderedMatch) {
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\s*[-*•]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(tokenizeInline(itemMatch[1].trim()));
        i++;
      }
      blocks.push({ type: 'unordered_list', items });
      continue;
    }

    // Markdown Table (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const rawHeaders = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((h) => h.trim());
        const headers = rawHeaders.map((h) => tokenizeInline(h));

        // Row 1 is divider (|---|---|)
        const rowLines = tableLines.slice(2);
        const rows: InlineToken[][][] = rowLines.map((r) => {
          const cells = r
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          return cells.map((c) => tokenizeInline(c));
        });

        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // Standard Paragraph
    blocks.push({
      type: 'paragraph',
      tokens: tokenizeInline(rawLine),
    });
    i++;
  }

  return blocks;
}

// Backward compatibility legacy array-of-lines parser
export function parseMarkdown(markdown: string): ParsedToken[][] {
  const blocks = parseMarkdownBlocks(markdown);
  return blocks.map((b) => [b]);
}
