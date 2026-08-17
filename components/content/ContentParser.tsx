'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { parseMarkdownBlocks } from '@/lib/parser';
import type { InlineToken, BlockToken } from '@/lib/parser';
import RecordLink from './RecordLink';
import DefinitionTooltip from './DefinitionTooltip';

interface ContentParserProps {
  content: string;
}

const renderInline = (token: InlineToken, key: string | number): React.ReactNode => {
  switch (token.type) {
    case 'text':
      return <span key={key}>{token.value}</span>;
    case 'bold':
      return (
        <strong key={key} style={{ fontWeight: 700, color: 'inherit' }}>
          {token.tokens ? token.tokens.map((t, i) => renderInline(t, `${key}-b-${i}`)) : token.value}
        </strong>
      );
    case 'italic':
      return (
        <em key={key} style={{ fontStyle: 'italic', color: 'inherit' }}>
          {token.tokens ? token.tokens.map((t, i) => renderInline(t, `${key}-i-${i}`)) : token.value}
        </em>
      );
    case 'color':
      return (
        <span key={key} style={{ color: token.color, fontWeight: 'inherit' }}>
          {token.tokens ? token.tokens.map((t, i) => renderInline(t, `${key}-c-${i}`)) : token.value}
        </span>
      );
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
            color: 'var(--color-brand-red)',
            fontWeight: 600,
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
  const blocks = parseMarkdownBlocks(content);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; alt: string } | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
      {blocks.map((block, blockIdx) => {
        switch (block.type) {
          case 'linebreak':
            return <div key={blockIdx} style={{ height: '4px' }} />;

          case 'hr':
            return (
              <div
                key={blockIdx}
                style={{
                  height: '1px',
                  background: 'var(--color-border-subtle)',
                  margin: '16px 0',
                }}
              />
            );

          case 'heading': {
            const headingContent = block.tokens.map((tok, i) => renderInline(tok, `${blockIdx}-h-${i}`));

            if (block.level === 1 || block.level === 2) {
              return (
                <h2
                  key={blockIdx}
                  style={{
                    fontSize: '12.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    paddingBottom: '6px',
                    marginTop: blockIdx > 0 ? '20px' : '0',
                    marginBottom: '6px',
                  }}
                >
                  {headingContent}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={blockIdx}
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-primary)',
                    marginTop: '14px',
                    marginBottom: '4px',
                  }}
                >
                  {headingContent}
                </h3>
              );
            }
            return (
              <h4
                key={blockIdx}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '10px',
                  marginBottom: '2px',
                }}
              >
                {headingContent}
              </h4>
            );
          }

          case 'paragraph':
            return (
              <p key={blockIdx} style={{ margin: 0, lineHeight: 1.65 }}>
                {block.tokens.map((tok, i) => renderInline(tok, `${blockIdx}-p-${i}`))}
              </p>
            );

          case 'ordered_list':
            return (
              <ol
                key={blockIdx}
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '6px 0 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--color-brand-red)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      {itemIdx + 1}
                    </span>
                    <div style={{ flex: 1, lineHeight: 1.5 }}>
                      {item.map((tok, i) => renderInline(tok, `${blockIdx}-ol-${itemIdx}-${i}`))}
                    </div>
                  </li>
                ))}
              </ol>
            );

          case 'unordered_list':
            return (
              <ul
                key={blockIdx}
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '6px 0 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      paddingLeft: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-brand-red)',
                        marginTop: '8px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, lineHeight: 1.5 }}>
                      {item.map((tok, i) => renderInline(tok, `${blockIdx}-ul-${itemIdx}-${i}`))}
                    </div>
                  </li>
                ))}
              </ul>
            );

          case 'callout': {
            const isCrit = block.variant === 'critical';
            const isUrg = block.variant === 'urgent';
            const borderCol = isCrit ? 'var(--badge-crit-border)' : isUrg ? 'var(--badge-urgent-border)' : 'var(--color-border)';
            const bgCol = isCrit ? 'var(--badge-crit-bg)' : isUrg ? 'var(--badge-urgent-bg)' : 'var(--color-bg-subtle)';
            const textCol = isCrit ? 'var(--badge-crit-text)' : isUrg ? 'var(--badge-urgent-text)' : 'var(--color-text-primary)';
            const label = isCrit ? 'URGENCE CRITIQUE' : isUrg ? 'ATTENTION CLINIQUE' : 'DIRECTIVE OPERATIONNELLE';

            return (
              <div
                key={blockIdx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: bgCol,
                  border: `1px solid ${borderCol}`,
                  borderLeft: `4px solid ${isCrit ? 'var(--color-brand-red)' : isUrg ? '#f59e0b' : 'var(--color-brand-blue)'}`,
                  margin: '8px 0',
                }}
              >
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: textCol,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}>
                  {label}
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                  {block.tokens.map((tok, i) => renderInline(tok, `${blockIdx}-c-${i}`))}
                </div>
              </div>
            );
          }

          case 'image':
            return (
              <figure
                key={blockIdx}
                style={{
                  margin: '14px 0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-subtle)',
                  cursor: 'pointer',
                  maxWidth: '100%',
                }}
                onClick={() => setLightboxImg({ url: block.url, alt: block.alt })}
              >
                <div style={{ position: 'relative', width: '100%', height: 'auto', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.url}
                    alt={block.alt}
                    style={{
                      width: '100%',
                      maxHeight: '440px',
                      objectFit: 'contain',
                      display: 'block',
                      background: 'rgba(0,0,0,0.2)',
                    }}
                    loading="lazy"
                  />
                </div>
                {block.alt && (
                  <figcaption
                    style={{
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      borderTop: '1px solid var(--color-border-subtle)',
                      background: 'var(--color-bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>📷 {block.alt}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-faint)' }}>Cliquer pour agrandir</span>
                  </figcaption>
                )}
              </figure>
            );

          case 'table':
            return (
              <div
                key={blockIdx}
                style={{
                  overflowX: 'auto',
                  margin: '12px 0 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          style={{
                            padding: '9px 14px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--color-text-muted)',
                            textAlign: 'left',
                            borderRight: hIdx < block.headers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                          }}
                        >
                          {h.map((tok, i) => renderInline(tok, `${blockIdx}-th-${hIdx}-${i}`))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: rIdx < block.rows.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                          backgroundColor: rIdx % 2 === 1 ? 'var(--color-bg-subtle)' : 'transparent',
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '8px 14px',
                              textAlign: 'left',
                              color: 'var(--color-text-secondary)',
                              borderRight: cIdx < row.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                            }}
                          >
                            {cell.map((tok, i) => renderInline(tok, `${blockIdx}-td-${rIdx}-${cIdx}-${i}`))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}

      {/* Image Lightbox Overlay */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'default',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg.url}
              alt={lightboxImg.alt}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: '12px',
              color: '#f8fafc',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
            }}>
              <span>{lightboxImg.alt}</span>
              <button
                onClick={() => setLightboxImg(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Fermer (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentParser;
