'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { SearchResult, WikiRecord } from '@/types';

interface Props {
  allRecords: WikiRecord[];
}

const CATEGORY_MAP: Record<string, string> = {
  protocol: 'Protocole',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvre',
  equipment: 'Matériel',
};

const SEVERITY_MAP: Record<string, string> = {
  critical: 'Urgence vitale',
  urgent: 'Urgent',
  routine: 'Routine',
};

// Helper for accent-insensitive search
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Zero-latency in-memory client-side search algorithm with accent normalization
function searchInMemory(records: WikiRecord[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const qNorm = normalizeText(query);
  const scored: { record: WikiRecord; score: number; snippet: string; matchField: string }[] = [];

  for (const record of records) {
    let score = 0;
    let matchField = 'title';
    const titleNorm = normalizeText(record.title);
    const slugNorm = normalizeText(record.slug);
    const summaryNorm = normalizeText(record.summary || '');
    const contentNorm = normalizeText(record.content || '');

    if (titleNorm === qNorm) { score += 100; matchField = 'title'; }
    else if (titleNorm.startsWith(qNorm)) { score += 60; matchField = 'title'; }
    else if (titleNorm.includes(qNorm)) { score += 40; matchField = 'title'; }

    if (slugNorm.includes(qNorm)) { score += 30; matchField = 'slug'; }

    for (const tag of record.tags || []) {
      if (normalizeText(tag).includes(qNorm)) {
        score += 25;
        matchField = 'tags';
        break;
      }
    }

    if (summaryNorm.includes(qNorm)) { score += 15; matchField = 'summary'; }

    let snippet = record.summary || '';
    const contentIdx = contentNorm.indexOf(qNorm);
    if (contentIdx !== -1) {
      score += 10;
      matchField = 'content';
      const start = Math.max(0, contentIdx - 40);
      const end = Math.min(record.content.length, contentIdx + query.length + 60);
      snippet = (start > 0 ? '…' : '') + record.content.slice(start, end).replace(/\n/g, ' ') + (end < record.content.length ? '…' : '');
    }

    if (score > 0) {
      scored.push({ record, score, snippet, matchField });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8);
}

export default function HomeSearchHub({ allRecords }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Instant In-Memory Filter (0ms latency)
  const results = useMemo(() => {
    return searchInMemory(allRecords, query);
  }, [allRecords, query]);

  useEffect(() => {
    if (query.trim() && results.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [query, results]);

  // Global Ctrl+K / Cmd+K listener to focus search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Global click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        setIsOpen(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        router.push(`/records/${results[selectedIndex].record.slug}`);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  // Dynamic Reflex Shortcuts (Pills): critical/urgent records first, max 4
  const reflexShortcuts = useMemo(() => {
    const criticals = allRecords.filter(r => r.severity === 'critical');
    const urgents = allRecords.filter(r => r.severity === 'urgent');
    const combined = [...criticals, ...urgents, ...allRecords];
    const unique = Array.from(new Set(combined.map(r => r.id)))
      .map(id => combined.find(r => r.id === id)!)
      .slice(0, 4);
    return unique;
  }, [allRecords]);

  // Dynamic 4 Columns Data from allRecords
  const protocols = useMemo(() => allRecords.filter(r => r.category === 'protocol'), [allRecords]);
  const medications = useMemo(() => allRecords.filter(r => r.category === 'medication'), [allRecords]);
  const maneuvers = useMemo(() => allRecords.filter(r => r.category === 'maneuver'), [allRecords]);
  const equipment = useMemo(() => allRecords.filter(r => r.category === 'equipment'), [allRecords]);

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '36px 0 44px',
      width: '100%',
      position: 'relative',
    }}>
      {/* Subtle Feutrée Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '640px',
          height: '280px',
          background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.015) 45%, transparent 70%)',
          filter: 'blur(45px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: '1240px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {/* Center Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '74px',
            height: '74px',
            position: 'relative',
            marginBottom: '10px',
          }}>
            <Image
              src="/lsfd-logo.png"
              alt="LSFD EMS Emblem"
              width={74}
              height={74}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          
          <h1 style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            margin: 0,
            lineHeight: 1.1,
          }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
            }}>
              LSFD
            </span>
            <span style={{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-brand-red)',
            }}>
              Medilog
            </span>
          </h1>
          
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            marginTop: '5px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}>
            Portail de recherche clinique et protocoles d'intervention préhospitalière
          </p>
        </div>

        {/* Search Bar */}
        <div ref={containerRef} style={{ width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '16px' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              border: (isFocused || (isOpen && results.length > 0))
                ? '1px solid rgba(239, 68, 68, 0.5)' 
                : '1px solid var(--color-border)',
              borderRadius: isOpen && results.length > 0 ? '24px 24px 0 0' : '24px',
              padding: '11px 18px',
              boxShadow: (isFocused || (isOpen && results.length > 0))
                ? '0 0 0 3px rgba(239, 68, 68, 0.12), 0 6px 20px rgba(0, 0, 0, 0.25)' 
                : 'var(--card-shadow)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 150ms ease',
            }}
          >
            {/* Search Icon */}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={(isFocused || (isOpen && results.length > 0)) ? 'var(--color-brand-red)' : 'var(--color-text-muted)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '12px', flexShrink: 0, transition: 'stroke 150ms ease' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => { setIsFocused(true); if (results.length > 0) setIsOpen(true); }}
              onBlur={() => { if (!isOpen) setIsFocused(false); }}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un protocole, une molécule, un geste..."
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14.5px',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-faint)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  padding: '0 6px',
                  marginRight: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ✕
              </button>
            )}

            {/* Shortcut Badge */}
            <kbd
              onClick={() => { inputRef.current?.focus(); setIsFocused(true); }}
              title="Raccourci clavier : Ctrl + K ou ⌘ + K"
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '2px 7px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
                flexShrink: 0,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 120ms ease',
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* Real-Time Search Results Dropdown */}
          {isOpen && results.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderTop: '1px solid var(--color-border-subtle)',
                borderRadius: '0 0 24px 24px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
                zIndex: 50,
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '6px 0',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={result.record.id}
                    onClick={() => router.push(`/records/${result.record.slug}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-brand-red)' : '3px solid transparent',
                      transition: 'background-color 100ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span className="badge badge-category" style={{ fontSize: '10px' }}>
                        {CATEGORY_MAP[result.record.category] || result.record.category}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {result.record.title}
                        </div>
                        <div style={{
                          fontSize: '11.5px',
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {result.snippet}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                      {result.record.severity && (
                        <span className={`badge badge-${result.record.severity}`} style={{ fontSize: '10px' }}>
                          {SEVERITY_MAP[result.record.severity] || result.record.severity}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        /{result.record.slug}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div style={{
                padding: '8px 18px',
                borderTop: '1px solid var(--color-border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-subtle)',
                borderRadius: '0 0 24px 24px',
              }}>
                <span>Appuyez sur Entrée pour naviguer</span>
                <span>{results.length} résultat{results.length > 1 ? 's' : ''} (0ms)</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Reflex Pills */}
        {reflexShortcuts.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '28px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Raccourcis réflexes :
            </span>
            {reflexShortcuts.map(item => (
              <Link
                key={item.id}
                href={`/records/${item.slug}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(8px)',
                }}
                className="suggestion-pill"
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: item.severity === 'critical' ? '#ef4444' : item.severity === 'urgent' ? '#f59e0b' : '#3b82f6',
                  display: 'inline-block',
                  boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)',
                }} />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Dynamic 4 Columns Technical Dispatch Hub */}
        <div style={{ width: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '0 4px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Index Technique & Protocoles Opérationnels ({allRecords.length})
            </span>
            <Link href="/search" style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 500 }} className="view-all-link">
              Base complète →
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            width: '100%',
          }} className="index-grid">
            
            {/* Col 1: Protocoles (ACLS & Soins) */}
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Protocoles ({protocols.length})
                </span>
                <span className="badge badge-critical" style={{ fontSize: '9.5px', padding: '2px 6px' }}>URGENT</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {protocols.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={`/records/${r.slug}`}
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                    }}
                    className="dense-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span className="row-code" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0 }}>
                        [PR-{String(idx + 1).padStart(2, '0')}]
                      </span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </span>
                    </div>
                    <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '11px' }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 2: Pharmacologie */}
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Pharmacologie ({medications.length})
                </span>
                <span className="badge badge-routine" style={{ fontSize: '9.5px', padding: '2px 6px' }}>ALS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {medications.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={`/records/${r.slug}`}
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                    }}
                    className="dense-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span className="row-code" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0 }}>
                        [PH-{String(idx + 1).padStart(2, '0')}]
                      </span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </span>
                    </div>
                    <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '11px' }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 3: Manœuvres */}
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Manœuvres ({maneuvers.length})
                </span>
                <span className="badge badge-urgent" style={{ fontSize: '9.5px', padding: '2px 6px' }}>GESTES</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {maneuvers.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={`/records/${r.slug}`}
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                    }}
                    className="dense-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span className="row-code" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0 }}>
                        [MN-{String(idx + 1).padStart(2, '0')}]
                      </span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </span>
                    </div>
                    <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '11px' }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 4: Matériel */}
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Matériel ({equipment.length})
                </span>
                <span style={{
                  fontSize: '9.5px',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                }}>
                  LOGISTIQUE
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {equipment.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={`/records/${r.slug}`}
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                    }}
                    className="dense-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span className="row-code" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '-0.02em', flexShrink: 0 }}>
                        [EQ-{String(idx + 1).padStart(2, '0')}]
                      </span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </span>
                    </div>
                    <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '11px' }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .suggestion-pill {
          transition: all 120ms ease;
        }
        .suggestion-pill:hover {
          border-color: var(--color-border-hover) !important;
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .dense-link {
          transition: all 120ms ease;
        }
        .dense-link .row-arrow {
          transition: transform 120ms ease, color 120ms ease;
        }
        .dense-link .row-code {
          transition: color 120ms ease;
        }
        .dense-link:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .dense-link:hover .row-arrow {
          color: var(--color-text-primary) !important;
          transform: translateX(3px);
        }
        .dense-link:hover .row-code {
          color: var(--color-text-primary) !important;
        }
        .view-all-link:hover {
          color: var(--color-text-primary) !important;
        }
        @media (max-width: 960px) {
          .index-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 540px) {
          .index-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
