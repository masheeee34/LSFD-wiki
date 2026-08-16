'use client';

import React from 'react';
import { parseMarkdown } from '@/lib/parser';
import type { ParsedToken } from '@/lib/parser';
import RecordLink from './RecordLink';
import DefinitionTooltip from './DefinitionTooltip';

interface ContentParserProps {
  content: string;
}

const renderInlineToken = (token: ParsedToken, key: string | number): React.ReactNode => {
  switch (token.type) {
    case 'text':
      return <span key={key}>{token.value}</span>;
    case 'bold':
      return <strong key={key} style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{token.value}</strong>;
    case 'italic':
      return <em key={key} style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{token.value}</em>;
    case 'code':
      return (
        <code
          key={key}
          style={{
            backgroundColor: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            padding: '1px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            fontWeight: 500,
          }}
        >
          {token.value}
        </code>
      );
    case 'link':
      return <RecordLink key={key} slug={token.slug} label={token.label} />;
    case 'definition':
      return <DefinitionTooltip key={key} word={token.word} explanation={token.explanation} />;
    default:
      return null;
  }
};

const ContentParser: React.FC<ContentParserProps> = ({ content }) => {
  const lineTokens = parseMarkdown(content);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
      {lineTokens.map((line, lineIdx) => {
        if (line.length === 0) {
          return <div key={lineIdx} style={{ height: '8px' }} />;
        }

        const first = line[0];

        if (first.type === 'linebreak') {
          return <div key={lineIdx} style={{ height: '8px' }} />;
        }

        if (first.type === 'hr') {
          return (
            <div
              key={lineIdx}
              style={{
                height: '1px',
                background: 'rgba(255, 255, 255, 0.08)',
                margin: '20px 0',
              }}
            />
          );
        }

        if (first.type === 'heading') {
          const headingContent = first.tokens.map((tok, i) => renderInlineToken(tok, `${lineIdx}-h-${i}`));

          if (first.level === 2) {
            return (
              <h2
                key={lineIdx}
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '6px',
                  marginTop: lineIdx > 0 ? '22px' : '0',
                  marginBottom: '10px',
                }}
              >
                {headingContent}
              </h2>
            );
          }
          if (first.level === 3) {
            return (
              <h3
                key={lineIdx}
                style={{
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)',
                  marginTop: '16px',
                  marginBottom: '6px',
                }}
              >
                {headingContent}
              </h3>
            );
          }
          return (
            <h4
              key={lineIdx}
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: 'var(--color-text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '12px',
                marginBottom: '4px',
              }}
            >
              {headingContent}
            </h4>
          );
        }

        // Render line of inline tokens
        return (
          <div key={lineIdx} style={{ minHeight: '22px' }}>
            {line.map((token, tokenIdx) => renderInlineToken(token, `${lineIdx}-${tokenIdx}`))}
          </div>
        );
      })}
    </div>
  );
};

export default ContentParser;
