export type ParsedToken =
  | { type: 'text'; value: string }
  | { type: 'link'; slug: string; label: string }
  | { type: 'definition'; explanation: string; word: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; tokens: ParsedToken[] }
  | { type: 'hr' }
  | { type: 'linebreak' };

export function tokenizeLine(line: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  let remaining = line;
  const patterns: Array<{ re: RegExp; handler: (m: RegExpExecArray) => ParsedToken }> = [
    {
      re: /\[\[link:([^|\]]+)(?:\|([^\]]+))?\]\]/,
      handler: (m) => ({
        type: 'link',
        slug: m[1].trim(),
        label: (m[2] ? m[2].trim() : m[1].trim()),
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
    let earliest: { index: number; length: number; token: ParsedToken } | null = null;

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

export function parseMarkdown(markdown: string): ParsedToken[][] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const result: ParsedToken[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      result.push([{ type: 'linebreak' }]);
      continue;
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      result.push([{ type: 'hr' }]);
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      const headingTokens = tokenizeLine(headingMatch[2].trim());
      result.push([{ type: 'heading', level, tokens: headingTokens }]);
      continue;
    }

    result.push(tokenizeLine(line));
  }

  return result;
}
