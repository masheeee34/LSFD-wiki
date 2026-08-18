export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'link'; slug: string; label: string }
  | { type: 'definition'; explanation: string; word: string }
  | { type: 'color'; color: string; value?: string; tokens: InlineToken[] }
  | { type: 'bold'; value?: string; tokens: InlineToken[] }
  | { type: 'italic'; value?: string; tokens: InlineToken[] }
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

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  rouge: '#ef4444',
  danger: '#ef4444',
  blue: '#3b82f6',
  bleu: '#3b82f6',
  info: '#3b82f6',
  green: '#10b981',
  vert: '#10b981',
  success: '#10b981',
  yellow: '#f59e0b',
  jaune: '#f59e0b',
  gold: '#f59e0b',
  or: '#f59e0b',
  warning: '#f59e0b',
  orange: '#f97316',
  purple: '#a855f7',
  violet: '#a855f7',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  pink: '#ec4899',
  rose: '#ec4899',
  white: '#ffffff',
  blanc: '#ffffff',
  muted: '#94a3b8',
  gris: '#94a3b8',
};

export function resolveColor(col: string): string {
  const c = col.trim().toLowerCase();
  if (COLOR_MAP[c]) return COLOR_MAP[c];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(col.trim())) return col.trim();
  if (/^(rgb|hsl)/i.test(col.trim())) return col.trim();
  return '#ef4444';
}

export function resolveColorAndStyles(param: string): { color: string; isBold: boolean; isItalic: boolean } {
  const parts = param.toLowerCase().split(/[,;|\s]+/).map(p => p.trim());
  let color = '#ef4444';
  let isBold = false;
  let isItalic = false;

  for (const part of parts) {
    if (part === 'bold' || part === 'gras' || part === 'b') {
      isBold = true;
    } else if (part === 'italic' || part === 'italique' || part === 'i') {
      isItalic = true;
    } else if (part) {
      color = resolveColor(part);
    }
  }

  return { color, isBold, isItalic };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Auto-expand plain text tokens using the Global Dictionary
function applyDictionaryToTextTokens(tokens: InlineToken[], dictionary?: Record<string, string>): InlineToken[] {
  if (!dictionary || Object.keys(dictionary).length === 0) return tokens;

  const allWords = Object.keys(dictionary).filter(w => w.trim().length > 0);
  if (allWords.length === 0) return tokens;

  // Short words (<= 3 chars) or uppercase words (e.g. PAS, GCS, BVM) MUST match case-sensitively
  const caseSensitiveWords = allWords
    .filter(w => w === w.toUpperCase() || w.length <= 3)
    .sort((a, b) => b.length - a.length);

  // Longer mixed/lowercase words can match case-insensitively
  const caseInsensitiveWords = allWords
    .filter(w => !(w === w.toUpperCase() || w.length <= 3))
    .sort((a, b) => b.length - a.length);

  const patterns: Array<{ regex: RegExp; exact: boolean }> = [];
  if (caseSensitiveWords.length > 0) {
    patterns.push({
      regex: new RegExp(`(?<![a-zA-Z0-9À-ÿ])(${caseSensitiveWords.map(escapeRegex).join('|')})(?![a-zA-Z0-9À-ÿ])`, 'g'),
      exact: true,
    });
  }
  if (caseInsensitiveWords.length > 0) {
    patterns.push({
      regex: new RegExp(`(?<![a-zA-Z0-9À-ÿ])(${caseInsensitiveWords.map(escapeRegex).join('|')})(?![a-zA-Z0-9À-ÿ])`, 'gi'),
      exact: false,
    });
  }

  if (patterns.length === 0) return tokens;

  let currentTokens = tokens;

  for (const { regex, exact } of patterns) {
    const nextTokens: InlineToken[] = [];

    for (const token of currentTokens) {
      if (token.type === 'text') {
        const text = token.value;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
          const matchedText = match[0];
          const matchIndex = match.index;

          if (matchIndex > lastIndex) {
            nextTokens.push({ type: 'text', value: text.substring(lastIndex, matchIndex) });
          }

          const dictKey = exact
            ? Object.keys(dictionary).find(k => k === matchedText) || matchedText
            : Object.keys(dictionary).find(k => k.toLowerCase() === matchedText.toLowerCase()) || matchedText;
          const explanation = dictionary[dictKey];

          if (explanation) {
            nextTokens.push({
              type: 'definition',
              word: matchedText,
              explanation,
            });
          } else {
            nextTokens.push({ type: 'text', value: matchedText });
          }

          lastIndex = matchIndex + matchedText.length;
        }

        if (lastIndex < text.length) {
          nextTokens.push({ type: 'text', value: text.substring(lastIndex) });
        }
      } else if (token.type === 'bold' && token.tokens) {
        nextTokens.push({ type: 'bold', tokens: applyDictionaryToTextTokens(token.tokens, dictionary) });
      } else if (token.type === 'italic' && token.tokens) {
        nextTokens.push({ type: 'italic', tokens: applyDictionaryToTextTokens(token.tokens, dictionary) });
      } else if (token.type === 'color' && token.tokens) {
        nextTokens.push({ type: 'color', color: token.color, tokens: applyDictionaryToTextTokens(token.tokens, dictionary) });
      } else {
        nextTokens.push(token);
      }
    }

    currentTokens = nextTokens;
  }

  return currentTokens;
}

export function tokenizeInline(text: string, dictionary?: Record<string, string>): InlineToken[] {
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
      re: /\[\[color:([^|\]]+)\|([\s\S]+?)\]\]/,
      handler: (m) => {
        const { color, isBold, isItalic } = resolveColorAndStyles(m[1]);
        let innerTokens = tokenizeInline(m[2], dictionary);
        if (isItalic) {
          innerTokens = [{ type: 'italic', tokens: innerTokens }];
        }
        if (isBold) {
          innerTokens = [{ type: 'bold', tokens: innerTokens }];
        }
        return {
          type: 'color',
          color,
          tokens: innerTokens,
        };
      },
    },
    {
      re: /<span\s+style=["']color:\s*([^"';]+)["']>([\s\S]*?)<\/span>/i,
      handler: (m) => {
        const color = resolveColor(m[1]);
        return {
          type: 'color',
          color,
          tokens: tokenizeInline(m[2], dictionary),
        };
      },
    },
    {
      re: /\*\*([^*]+)\*\*/,
      handler: (m) => ({
        type: 'bold',
        tokens: tokenizeInline(m[1], dictionary),
      }),
    },
    {
      re: /\*([^*]+)\*/,
      handler: (m) => ({
        type: 'italic',
        tokens: tokenizeInline(m[1], dictionary),
      }),
    },
    {
      re: /`([^`]+)`/,
      handler: (m) => ({ type: 'code', value: m[1] }),
    },
  ];

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      length: number;
      token: InlineToken;
    } | null = null;

    for (const { re, handler } of patterns) {
      const match = re.exec(remaining);
      if (match && match.index !== -1) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            token: handler(match),
          };
        }
      }
    }

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        tokens.push({
          type: 'text',
          value: remaining.slice(0, earliestMatch.index),
        });
      }
      tokens.push(earliestMatch.token);
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      tokens.push({ type: 'text', value: remaining });
      break;
    }
  }

  // Apply automatic global dictionary detection across text tokens
  return applyDictionaryToTextTokens(tokens, dictionary);
}

export function parseMarkdownBlocks(content: string, dictionary?: Record<string, string>): BlockToken[] {
  if (!content) return [];

  const lines = content.split('\n');
  const blocks: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      blocks.push({ type: 'linebreak' });
      i++;
      continue;
    }

    if (/^---{1,}$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        alt: imgMatch[1],
        url: imgMatch[2],
      });
      i++;
      continue;
    }

    const calloutMatch = /^>\s*\[!(CRITICAL|URGENT|WARNING|NOTE|INFO)\](.*)$/i.exec(trimmed);
    if (calloutMatch) {
      const variantType = calloutMatch[1].toUpperCase();
      const variant: 'critical' | 'urgent' | 'info' =
        variantType === 'CRITICAL' ? 'critical' : variantType === 'URGENT' || variantType === 'WARNING' ? 'urgent' : 'info';
      
      const calloutLines: string[] = [];
      if (calloutMatch[2].trim()) calloutLines.push(calloutMatch[2].trim());
      i++;

      while (i < lines.length && lines[i].trim().startsWith('>')) {
        calloutLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }

      blocks.push({
        type: 'callout',
        variant,
        tokens: tokenizeInline(calloutLines.join('\n'), dictionary),
      });
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({
        type: 'heading',
        level,
        tokens: tokenizeInline(headingMatch[2], dictionary),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => tokenizeInline(c.trim(), dictionary));
        
        const rowStartIndex = /^\|(?:\s*:?-+:?\s*\|)+$/.test(tableLines[1]) ? 2 : 1;

        const rows: InlineToken[][][] = [];
        for (let r = rowStartIndex; r < tableLines.length; r++) {
          const cells = tableLines[r]
            .slice(1, -1)
            .split('|')
            .map((c) => tokenizeInline(c.trim(), dictionary));
          rows.push(cells);
        }

        blocks.push({
          type: 'table',
          headers: headerCells,
          rows,
        });
        continue;
      }
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        items.push(tokenizeInline(itemText, dictionary));
        i++;
      }
      blocks.push({
        type: 'ordered_list',
        items,
      });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '');
        items.push(tokenizeInline(itemText, dictionary));
        i++;
      }
      blocks.push({
        type: 'unordered_list',
        items,
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^---{1,}$/.test(lines[i].trim()) &&
      !/^!\[/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        tokens: tokenizeInline(paragraphLines.join(' '), dictionary),
      });
    }
  }

  return blocks;
}
