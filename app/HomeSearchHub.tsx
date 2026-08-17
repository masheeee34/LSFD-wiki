'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { SearchResult, WikiRecord, InterventionPack } from '@/types';

interface Props {
  allRecords: WikiRecord[];
  allPacks?: InterventionPack[];
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

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

export default function HomeSearchHub({ allRecords, allPacks = [] }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const reflexShortcuts = useMemo(() => {
    const criticals = allRecords.filter(r => r.severity === 'critical');
    const urgents = allRecords.filter(r => r.severity === 'urgent');
    const combined = [...criticals, ...urgents, ...allRecords];
    const unique = Array.from(new Set(combined.map(r => r.id)))
      .map(id => combined.find(r => r.id === id)!)
      .slice(0, 4);
    return unique;
  }, [allRecords]);

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
      padding: '30px 16px 60px',
      width: '100%',
    }}>
      <div style={{ width: '100%', maxWidth: '1240px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Center Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            position: 'relative',
            marginBottom: '8px',
          }}>
            <Image
              src="/lsfd-logo.png"
              alt="LSFD EMS Emblem"
              width={68}
              height={68}
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
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
            }}>
              LSFD
            </span>
            <span style={{
              fontSize: '28px',
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
            marginTop: '6px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
          }}>
            Portail clinique et protocoles d'intervention opérationnels du Los Santos Fire Department
          </p>
        </div>

        {/* Central Search Bar */}
        <div ref={containerRef} style={{ width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '14px' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              border: (isFocused || (isOpen && results.length > 0))
                ? '1px solid var(--color-brand-red)' 
                : '1px solid var(--color-border)',
              borderRadius: isOpen && results.length > 0 ? '20px 20px 0 0' : '20px',
              padding: '10px 18px',
              boxShadow: 'var(--card-shadow)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 120ms ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={(isFocused || (isOpen && results.length > 0)) ? 'var(--color-brand-red)' : 'var(--color-text-muted)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '10px', flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

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
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            />

            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-faint)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 6px',
                }}
              >
                ✕
              </button>
            )}

            <kbd
              onClick={() => { inputRef.current?.focus(); setIsFocused(true); }}
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
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* Real-Time Dropdown Results */}
          {isOpen && results.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-brand-red)',
                borderTop: 'none',
                borderRadius: '0 0 20px 20px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
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
                borderRadius: '0 0 20px 20px',
              }}>
                <span>Appuyez sur Entrée pour naviguer</span>
                <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>

        {/* Reflex Shortcuts */}
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                className="suggestion-pill"
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: item.severity === 'critical' ? '#ef4444' : item.severity === 'urgent' ? '#f59e0b' : '#3b82f6',
                  display: 'inline-block',
                }} />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* CLASSEURS D'INTERVENTION (PACKS) */}
        {allPacks.length > 0 && (
          <div style={{ width: '100%', marginBottom: '28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '0 4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px' }}>📑</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-red)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                  CLASSEURS D'INTERVENTION & PACKS PROTOCOLES ({allPacks.length})
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                Séquences multi-fiches avec navigation par onglets H24
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }} className="packs-grid">
              {allPacks.map(pack => (
                <Link
                  key={pack.id}
                  href={`/packs/${pack.slug}`}
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: '4px solid var(--color-brand-red)',
                    transition: 'all 120ms ease',
                  }}
                  className="pack-card-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--color-brand-red)',
                      }}>
                        {pack.code || 'PACK'}
                      </span>
                      {pack.badgeLabel && (
                        <span className="badge badge-critical" style={{ fontSize: '9px', padding: '1px 6px' }}>
                          {pack.badgeLabel}
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'var(--color-bg-subtle)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                    }}>
                      {pack.recordSlugs.length} protocoles
                    </span>
                  </div>

                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px',
                  }}>
                    {pack.title}
                  </div>

                  {pack.description && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.4,
                      marginBottom: '10px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {pack.description}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    fontSize: '11.5px',
                    color: 'var(--color-brand-red)',
                    fontWeight: 600,
                  }}>
                    <span>Ouvrir la séquence d'intervention</span>
                    <span className="pack-arrow">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 4 COLUMNS INDEX */}
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
            
            {/* Col 1: Protocoles */}
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
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
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
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
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
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
            <div className="linear-card" style={{ padding: '16px 18px', borderRadius: '8px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
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
                  color: '#4ade80',
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
        .pack-card-link:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .pack-card-link:hover .pack-arrow {
          transform: translateX(4px);
        }
        .pack-arrow {
          transition: transform 120ms ease;
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
          .packs-grid {
            grid-template-columns: 1fr !important;
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
