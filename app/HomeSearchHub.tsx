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
  protocol: 'Protocoles',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvres',
  equipment: 'Matériel',
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

  const protocols = useMemo(() => allRecords.filter(r => r.category === 'protocol'), [allRecords]);
  const medications = useMemo(() => allRecords.filter(r => r.category === 'medication'), [allRecords]);
  const maneuvers = useMemo(() => allRecords.filter(r => r.category === 'maneuver'), [allRecords]);
  const equipment = useMemo(() => allRecords.filter(r => r.category === 'equipment'), [allRecords]);

  return (
    <div style={{
      width: '100%',
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '24px 16px 80px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
    }}>
      
      {/* 1. MINIMALIST TOP HEADER & SEARCH */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--color-border-subtle)',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', position: 'relative' }}>
            <Image
              src="/lsfd-logo.png"
              alt="LSFD"
              width={36}
              height={36}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              LSFD Medilog
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              Protocoles Médicaux & Pharmacologie
            </div>
          </div>
        </div>

        {/* Minimalist Search Bar */}
        <div ref={containerRef} style={{ flex: '1 1 320px', maxWidth: '440px', position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-surface)',
            border: isFocused ? '1px solid var(--color-text-secondary)' : '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px 12px',
            transition: 'border-color 120ms ease',
          }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '8px', flexShrink: 0 }}
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
              placeholder="Rechercher... (Ctrl+K)"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
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
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            )}

            <kbd style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: '3px',
              padding: '1px 4px',
              background: 'var(--color-bg-subtle)',
            }}>
              ⌘K
            </kbd>
          </div>

          {/* Minimalist Search Results Dropdown */}
          {isOpen && results.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              zIndex: 50,
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={result.record.id}
                    onClick={() => router.push(`/records/${result.record.slug}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {result.record.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {CATEGORY_MAP[result.record.category] || result.record.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. PACKS D'INTERVENTION (CLASSEURS MULTI-FICHES) — MINIMALIST LIST */}
      {allPacks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
          }}>
            Packs d'Intervention & Séquences d'Urgence
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }} className="packs-grid-minimal">
            {allPacks.map(pack => (
              <Link
                key={pack.id}
                href={`/packs/${pack.slug}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  transition: 'all 120ms ease',
                }}
                className="minimal-pack-card"
              >
                <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-red)' }}>
                      {pack.code || 'PACK'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.title}
                    </span>
                  </div>
                  {pack.description && (
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.description}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {pack.recordSlugs.length} fiches
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. RÉFÉRENTIEL MÉDICAL — MINIMALIST 4 COLUMNS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
        }}>
          <span>Référentiel Clinique ({allRecords.length} fiches)</span>
          <Link href="/search" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }} className="minimal-link">
            Tout voir →
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }} className="directory-grid-minimal">
          
          {/* Protocoles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Protocoles</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {protocols.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {protocols.map(r => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'all 100ms ease',
                  }}
                  className="minimal-item-link"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Pharmacologie */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Pharmacologie</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {medications.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {medications.map(r => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'all 100ms ease',
                  }}
                  className="minimal-item-link"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Manœuvres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Manœuvres</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {maneuvers.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {maneuvers.map(r => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'all 100ms ease',
                  }}
                  className="minimal-item-link"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Matériel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Matériel</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {equipment.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {equipment.map(r => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'all 100ms ease',
                  }}
                  className="minimal-item-link"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .minimal-pack-card:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .minimal-item-link:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .minimal-link:hover {
          color: var(--color-text-primary) !important;
        }
        @media (max-width: 840px) {
          .directory-grid-minimal {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .packs-grid-minimal {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 520px) {
          .directory-grid-minimal {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
