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
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      
      {/* Brand & Search Header */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          width: '58px',
          height: '58px',
          position: 'relative',
          marginBottom: '6px',
        }}>
          <Image
            src="/lsfd-logo.png"
            alt="LSFD EMS"
            width={58}
            height={58}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          LSFD <span style={{ color: 'var(--color-brand-red)' }}>Medilog</span>
        </h1>
        
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginTop: '4px',
          fontFamily: 'var(--font-sans)',
        }}>
          Protocoles & Référentiel Clinique Opérationnel du Los Santos Fire Department
        </p>
      </div>

      {/* Central Search Bar */}
      <div ref={containerRef} style={{ width: '100%', maxWidth: '580px', position: 'relative', marginBottom: '14px' }}>
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-surface)',
            border: (isFocused || (isOpen && results.length > 0))
              ? '1px solid var(--color-brand-red)' 
              : '1px solid var(--color-border)',
            borderRadius: isOpen && results.length > 0 ? '8px 8px 0 0' : '8px',
            padding: '9px 14px',
            boxShadow: 'var(--card-shadow)',
            transition: 'all 120ms ease',
          }}
        >
          <svg
            width="15"
            height="15"
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
              fontSize: '13.5px',
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
                fontSize: '13px',
                padding: '0 4px',
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
              padding: '2px 6px',
              fontSize: '10.5px',
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

        {/* Dropdown Live Results */}
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
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              zIndex: 50,
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '4px 0',
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
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-brand-red)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span className="badge badge-category" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                      {CATEGORY_MAP[result.record.category] || result.record.category}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {result.record.title}
                    </span>
                  </div>
                  {result.record.severity && (
                    <span className={`badge badge-${result.record.severity}`} style={{ fontSize: '9.5px', padding: '1px 5px', flexShrink: 0 }}>
                      {SEVERITY_MAP[result.record.severity] || result.record.severity}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reflex Shortcuts */}
      {reflexShortcuts.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '26px',
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Accès direct :
          </span>
          {reflexShortcuts.map(item => (
            <Link
              key={item.id}
              href={`/records/${item.slug}`}
              style={{
                fontSize: '11.5px',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                padding: '3px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              className="suggestion-pill"
            >
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: item.severity === 'critical' ? '#ef4444' : item.severity === 'urgent' ? '#f59e0b' : '#3b82f6',
                display: 'inline-block',
              }} />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      )}

      {/* CLASSEURS D'INTERVENTION (PACKS MULTI-FICHES) — NOUVEAU DESIGN ÉPURÉ */}
      {allPacks.length > 0 && (
        <div style={{ width: '100%', marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '0 2px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                CLASSEURS D'INTERVENTION ({allPacks.length})
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Séquences cliniques avec onglets H24
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }} className="packs-grid">
            {allPacks.map(pack => (
              <Link
                key={pack.id}
                href={`/packs/${pack.slug}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  transition: 'all 120ms ease',
                  gap: '12px',
                }}
                className="clean-pack-card"
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--color-brand-red)',
                    }}>
                      {pack.code || 'PACK'}
                    </span>
                    {pack.badgeLabel && (
                      <span className="badge badge-critical" style={{ fontSize: '8.5px', padding: '1px 4px' }}>
                        {pack.badgeLabel}
                      </span>
                    )}
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.title}
                    </span>
                  </div>

                  {pack.description && (
                    <div style={{
                      fontSize: '11.5px',
                      color: 'var(--color-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {pack.description}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-bg-subtle)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                  }}>
                    {pack.recordSlugs.length} protocoles
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }} className="pack-chevron">
                    →
                  </span>
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
          marginBottom: '10px',
          padding: '0 2px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
            RÉFÉRENTIEL OPÉRATIONNEL ({allRecords.length})
          </span>
          <Link href="/search" style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 500 }} className="view-all-link">
            Base complète →
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          width: '100%',
        }} className="index-grid">
          
          {/* Col 1: Protocoles */}
          <div className="linear-card" style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: '8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Protocoles ({protocols.length})
              </span>
              <span className="badge badge-critical" style={{ fontSize: '9px', padding: '1px 5px' }}>URGENT</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {protocols.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  className="dense-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span className="row-code" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      [PR-{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </span>
                  </div>
                  <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '10px' }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 2: Pharmacologie */}
          <div className="linear-card" style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: '8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Pharmacologie ({medications.length})
              </span>
              <span className="badge badge-routine" style={{ fontSize: '9px', padding: '1px 5px' }}>ALS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {medications.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  className="dense-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span className="row-code" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      [PH-{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </span>
                  </div>
                  <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '10px' }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Manœuvres */}
          <div className="linear-card" style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: '8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Manœuvres ({maneuvers.length})
              </span>
              <span className="badge badge-urgent" style={{ fontSize: '9px', padding: '1px 5px' }}>GESTES</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {maneuvers.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  className="dense-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span className="row-code" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      [MN-{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </span>
                  </div>
                  <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '10px' }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: Matériel */}
          <div className="linear-card" style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: '8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Matériel ({equipment.length})
              </span>
              <span style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '3px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}>
                MATÉRIEL
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {equipment.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  className="dense-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span className="row-code" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      [EQ-{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </span>
                  </div>
                  <span className="row-arrow" style={{ flexShrink: 0, color: 'var(--color-text-faint)', fontSize: '10px' }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .suggestion-pill:hover {
          border-color: var(--color-border-hover) !important;
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .clean-pack-card:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .clean-pack-card:hover .pack-chevron {
          color: var(--color-brand-red) !important;
          transform: translateX(2px);
        }
        .pack-chevron {
          transition: transform 120ms ease, color 120ms ease;
        }
        .dense-link {
          transition: all 120ms ease;
        }
        .dense-link .row-arrow {
          transition: transform 120ms ease, color 120ms ease;
        }
        .dense-link:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .dense-link:hover .row-arrow {
          color: var(--color-text-primary) !important;
          transform: translateX(2px);
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
