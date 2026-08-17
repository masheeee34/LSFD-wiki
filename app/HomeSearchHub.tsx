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

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  all: { label: 'Tous', icon: '📋' },
  protocol: { label: 'Protocoles', icon: '🚑' },
  medication: { label: 'Pharmacologie', icon: '💊' },
  maneuver: { label: 'Manœuvres', icon: '🖐' },
  equipment: { label: 'Équipement', icon: '🛠' },
  packs: { label: 'Packs d\'urgence', icon: '📂' },
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function searchInMemory(records: WikiRecord[], packs: InterventionPack[], query: string): SearchResult[] {
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
  return scored.slice(0, 10);
}

export default function HomeSearchHub({ allRecords, allPacks = [] }: Props) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const searchResults = useMemo(() => {
    return searchInMemory(allRecords, allPacks, query);
  }, [allRecords, allPacks, query]);

  useEffect(() => {
    if (query.trim() && searchResults.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [query, searchResults]);

  // Global shortcut Cmd+K / Ctrl+K
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

  // Click outside to close search dropdown
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
      if (searchResults.length > 0) {
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
        setIsOpen(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        router.push(`/records/${searchResults[selectedIndex].record.slug}`);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  // Critical emergencies for quick sidebar access
  const criticalRecords = useMemo(() => {
    return allRecords.filter(r => r.severity === 'critical').slice(0, 4);
  }, [allRecords]);

  // Filtered records by category
  const filteredRecords = useMemo(() => {
    if (selectedCategory === 'all') return allRecords;
    if (selectedCategory === 'packs') return [];
    return allRecords.filter(r => r.category === selectedCategory);
  }, [allRecords, selectedCategory]);

  const counts = useMemo(() => ({
    all: allRecords.length,
    protocol: allRecords.filter(r => r.category === 'protocol').length,
    medication: allRecords.filter(r => r.category === 'medication').length,
    maneuver: allRecords.filter(r => r.category === 'maneuver').length,
    equipment: allRecords.filter(r => r.category === 'equipment').length,
    packs: allPacks.length,
  }), [allRecords, allPacks]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)' }}>
      
      {/* 1. TOPBAR (56px) — Fixed height, integrated Cmd+K search */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '56px',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Left: Compact Logo + Title */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', position: 'relative' }}>
              <Image
                src="/lsfd-logo.png"
                alt="LSFD"
                width={28}
                height={28}
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              LSFD <span style={{ color: 'var(--color-brand-red)' }}>Medilog</span>
            </span>
          </Link>

          {/* Center: Integrated Cmd+K Search Bar (max 480px) */}
          <div ref={containerRef} style={{ flex: '1 1 360px', maxWidth: '480px', position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-base)',
              border: isFocused ? '1px solid var(--color-border-hover)' : '1px solid var(--color-border)',
              borderRadius: isOpen && searchResults.length > 0 ? '6px 6px 0 0' : '6px',
              padding: '6px 12px',
              transition: 'all 120ms ease',
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
                onFocus={() => { setIsFocused(true); if (searchResults.length > 0) setIsOpen(true); }}
                onBlur={() => { if (!isOpen) setIsFocused(false); }}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher dans les protocoles... (⌘K)"
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
                    color: 'var(--color-text-faint)',
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
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '3px',
                padding: '1px 5px',
                marginLeft: '4px',
                userSelect: 'none',
              }}>
                ⌘K
              </kbd>
            </div>

            {/* Live Search Results Dropdown */}
            {isOpen && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)',
                zIndex: 50,
                maxHeight: '320px',
                overflowY: 'auto',
              }}>
                {searchResults.map((result, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={result.record.id}
                      onClick={() => router.push(`/records/${result.record.slug}`)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {result.record.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {CATEGORY_CONFIG[result.record.category]?.label || result.record.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Operational Status & Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span>En service</span>
            </div>

            <Link
              href="/admin"
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: '5px',
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
                fontWeight: 500,
                transition: 'all 120ms ease',
              }}
              className="admin-btn"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* 2. BODY: 2-COLUMN LAYOUT (SIDEBAR 240px + MAIN AREA FLEX-1) */}
      <div style={{
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        gap: '24px',
        flex: 1,
      }} className="app-body-container">
        
        {/* SIDEBAR GAUCHE (240px, Sticky) */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }} className="app-sidebar">
          
          {/* Section 1: Urgences Vitales */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              marginBottom: '8px',
              paddingLeft: '6px',
              letterSpacing: '0.02em',
            }}>
              Urgences vitales
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {criticalRecords.map(r => (
                <Link
                  key={r.id}
                  href={`/records/${r.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '5px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    transition: 'all 100ms ease',
                  }}
                  className="sidebar-item"
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-brand-red)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Section 2: Catégories & Navigation */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              marginBottom: '8px',
              paddingLeft: '6px',
              letterSpacing: '0.02em',
            }}>
              Référentiel clinique
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {(['all', 'protocol', 'medication', 'maneuver', 'equipment', 'packs'] as const).map(catKey => {
                const isSelected = selectedCategory === catKey;
                const config = CATEGORY_CONFIG[catKey];
                const count = counts[catKey];
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                      color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 100ms ease',
                    }}
                    className="sidebar-nav-btn"
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {config.label}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ZONE PRINCIPALE (flex-1, Haute Densité Style Linear / GitBook) */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header & Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                {CATEGORY_CONFIG[selectedCategory]?.label || 'Tous les protocoles'}
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                {selectedCategory === 'packs' 
                  ? `${allPacks.length} classeurs d'urgence multi-fiches`
                  : `${filteredRecords.length} fiches répertoriées`
                }
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(['all', 'protocol', 'medication', 'maneuver', 'equipment', 'packs'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedCategory(k)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: selectedCategory === k ? 'var(--color-bg-subtle)' : 'transparent',
                    color: selectedCategory === k ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontSize: '12px',
                    fontWeight: selectedCategory === k ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 100ms ease',
                  }}
                  className="filter-pill-btn"
                >
                  {CATEGORY_CONFIG[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* VUE 1: PACKS D'INTERVENTION (Si catégorie "packs" sélectionnée) */}
          {selectedCategory === 'packs' ? (
            <div style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              {allPacks.map((pack, idx) => (
                <Link
                  key={pack.id}
                  href={`/packs/${pack.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: idx < allPacks.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color 100ms ease',
                    gap: '16px',
                  }}
                  className="data-row"
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {pack.title}
                      </span>
                      {pack.badgeLabel && (
                        <span style={{ fontSize: '11px', color: 'var(--color-brand-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-brand-red)' }} />
                          {pack.badgeLabel}
                        </span>
                      )}
                    </div>
                    {pack.description && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pack.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {pack.recordSlugs.length} protocoles
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }} className="row-chevron">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* VUE 2: TABLE INTERACTIVE HAUTE DENSITÉ (Style Linear / GitBook) */
            <div style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 2fr) 110px minmax(200px, 3fr) 80px 30px',
                padding: '8px 16px',
                backgroundColor: 'var(--color-bg-subtle)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.02em',
              }} className="table-header-grid">
                <div>Procédure</div>
                <div>Domaine</div>
                <div>Résumé clinique</div>
                <div>Gravité</div>
                <div style={{ textAlign: 'right' }}></div>
              </div>

              {/* Data rows */}
              {filteredRecords.map((record, idx) => {
                const isCritical = record.severity === 'critical';
                const isUrgent = record.severity === 'urgent';

                return (
                  <Link
                    key={record.id}
                    href={`/records/${record.slug}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 2fr) 110px minmax(200px, 3fr) 80px 30px',
                      padding: '10px 16px',
                      borderBottom: idx < filteredRecords.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      alignItems: 'center',
                      transition: 'background-color 100ms ease',
                      fontSize: '12.5px',
                    }}
                    className="data-row"
                  >
                    {/* Title */}
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                      {record.title}
                    </div>

                    {/* Category */}
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                      {CATEGORY_CONFIG[record.category]?.label || record.category}
                    </div>

                    {/* Summary */}
                    <div style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px', fontSize: '12px' }}>
                      {record.summary || '—'}
                    </div>

                    {/* Severity (discreet dot) */}
                    <div>
                      {isCritical ? (
                        <span style={{ fontSize: '11.5px', color: 'var(--color-brand-red)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-brand-red)' }} />
                          Critique
                        </span>
                      ) : isUrgent ? (
                        <span style={{ fontSize: '11.5px', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                          Urgent
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: '11.5px' }}>—</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <div style={{ textAlign: 'right', color: 'var(--color-text-faint)', fontSize: '12px' }} className="row-chevron">
                      →
                    </div>
                  </Link>
                );
              })}

              {filteredRecords.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  Aucun protocole trouvé dans cette catégorie.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        .sidebar-item:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .sidebar-nav-btn:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .filter-pill-btn:hover {
          color: var(--color-text-primary) !important;
        }
        .data-row:hover {
          background-color: var(--color-bg-hover) !important;
        }
        .data-row:hover .row-chevron {
          color: var(--color-text-primary) !important;
          transform: translateX(2px);
        }
        .row-chevron {
          transition: transform 100ms ease, color 100ms ease;
        }
        .admin-btn:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border-hover) !important;
        }
        @media (max-width: 860px) {
          .app-body-container {
            flex-direction: column !important;
          }
          .app-sidebar {
            width: 100% !important;
          }
          .table-header-grid {
            display: none !important;
          }
          .data-row {
            grid-template-columns: 1fr auto !important;
            gap: 6px !important;
          }
        }
      `}</style>
    </div>
  );
}
