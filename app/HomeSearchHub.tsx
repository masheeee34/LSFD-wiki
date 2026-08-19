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

  // Click outside to close dropdown
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

  // Structured Major Categories with clear icons and count
  const majorCategories = [
    { label: 'Protocoles', icon: '🚑', href: '/search?category=protocol', count: allRecords.filter(r => r.category === 'protocol').length },
    { label: 'Pharmacologie', icon: '💊', href: '/search?category=medication', count: allRecords.filter(r => r.category === 'medication').length },
    { label: 'Manœuvres', icon: '🖐', href: '/search?category=maneuver', count: allRecords.filter(r => r.category === 'maneuver').length },
    { label: 'Matériel', icon: '🛠', href: '/search?category=equipment', count: allRecords.filter(r => r.category === 'equipment').length },
    { label: 'Packs d\'Intervention', icon: '📂', href: '/packs', count: allPacks.length },
  ];

  // Prioritized vital reflex protocols for quick access
  const reflexProtocols = useMemo(() => {
    // Keywords for essential emergency reflexes
    const priorityKeywords = ['arret', 'cardio', 'abcde', 'polytrauma', 'scene', 'detresse', 'respiratoire', 'rsi', 'choc', 'glasgow', 'avpu', 'douleur', 'thoracique', 'pneumothorax', 'brulure', 'hemorragie'];
    
    const matched = allRecords.filter(r => {
      const norm = normalizeText(`${r.slug} ${r.title} ${r.tags.join(' ')}`);
      return priorityKeywords.some(kw => norm.includes(kw));
    });

    const criticals = allRecords.filter(r => r.severity === 'critical');
    const combined = [...matched, ...criticals, ...allRecords];

    const unique: WikiRecord[] = [];
    const seen = new Set<string>();

    for (const r of combined) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        unique.push(r);
      }
      if (unique.length >= 8) break;
    }

    return unique;
  }, [allRecords]);

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 110px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--color-bg-base)',
      padding: '40px 20px 60px',
    }}>
      <div style={{
        maxWidth: '820px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}>

        {/* Central LSFD Emblem */}
        <div style={{
          width: '72px',
          height: '72px',
          position: 'relative',
          marginBottom: '14px',
        }}>
          <Image
            src="/lsfd-logo.png"
            alt="LSFD EMS"
            width={72}
            height={72}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Main Title (Clean White & Crimson Institutional, No Neon Blue Clash) */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: 'var(--color-text-primary)',
          margin: '0 0 6px',
          lineHeight: 1.2,
        }}>
          LSFD <span style={{ color: 'var(--color-brand-red)' }}>Medilog</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '13.5px',
          color: 'var(--color-text-secondary)',
          margin: '0 0 26px',
          maxWidth: '520px',
          lineHeight: 1.5,
        }}>
          Moteur de recherche des protocoles d'urgence et pharmacopée EMS
        </p>

        {/* Central Search Bar */}
        <div ref={containerRef} style={{ width: '100%', maxWidth: '620px', position: 'relative', marginBottom: '28px' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              border: isFocused ? '1px solid var(--color-brand-red)' : '1px solid var(--color-border)',
              borderRadius: isOpen && results.length > 0 ? '22px 22px 0 0' : '22px',
              padding: '10px 18px',
              boxShadow: 'var(--card-shadow)',
              transition: 'all 120ms ease',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isFocused ? 'var(--color-brand-red)' : 'var(--color-text-muted)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '12px', flexShrink: 0 }}
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
                  fontSize: '13px',
                  padding: '0 6px',
                }}
              >
                ✕
              </button>
            )}

            <kbd style={{
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '10.5px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
              userSelect: 'none',
            }}>
              {query.trim() ? '↵ Entrée' : '⌘K'}
            </kbd>
          </div>

          {/* Autocomplete Dropdown */}
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
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '6px 0',
                textAlign: 'left',
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

        {/* 1. DOMAINES & CATÉGORIES (Distinct Category Cards) */}
        <div style={{ width: '100%', marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
          }}>
            {majorCategories.map(cat => (
              <Link
                key={cat.label}
                href={cat.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  boxShadow: 'var(--card-shadow)',
                }}
                className="category-card-btn"
              >
                <span style={{ fontSize: '13px' }}>{cat.icon}</span>
                <span>{cat.label}</span>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}>
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. ACCÈS RAPIDE AUX PROTOCOLES RÉFLEXES (Distinct Emergency Pills) */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
          }}>
            Protocoles réflexes d'urgence
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '6px',
            maxWidth: '720px',
          }}>
            {reflexProtocols.map(record => (
              <Link
                key={record.id}
                href={`/records/${record.slug}`}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  padding: '4px 11px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 120ms ease',
                }}
                className="reflex-protocol-pill"
              >
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: record.severity === 'critical' ? 'var(--color-brand-red)' : record.severity === 'urgent' ? '#f59e0b' : '#3b82f6',
                  display: 'inline-block',
                }} />
                <span>{record.title}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        .category-card-btn:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
          transform: translateY(-1px);
        }
        .reflex-protocol-pill:hover {
          border-color: var(--color-brand-red) !important;
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
