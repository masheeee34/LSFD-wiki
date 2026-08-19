'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { SearchResult, WikiRecord, InterventionPack } from '@/types';
import ThemeToggle from '@/components/theme/ThemeToggle';

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

  const handleRandomRecord = () => {
    if (allRecords.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allRecords.length);
    router.push(`/records/${allRecords[randomIndex].slug}`);
  };

  // Direct quick emergency reflex records
  const criticalCardio = useMemo(() => {
    return allRecords.find(r => r.slug.includes('arret') || r.slug.includes('cardio') || r.slug.includes('acls')) || allRecords.find(r => r.severity === 'critical') || allRecords[0];
  }, [allRecords]);

  // Primary categories
  const categoryPills = [
    { label: 'Protocoles ACLS & Soins', href: '/search?category=protocol' },
    { label: 'Pharmacologie & Molécules', href: '/search?category=medication' },
    { label: 'Manœuvres & Gestes', href: '/search?category=maneuver' },
    { label: 'Dotation Matériel', href: '/search?category=equipment' },
    { label: 'Packs d\'Intervention', href: allPacks.length > 0 ? `/packs/${allPacks[0].slug}` : '/search' },
  ];

  // Specific high-frequency clinical shortcut pills
  const protocolPills = useMemo(() => {
    return allRecords.slice(0, 8);
  }, [allRecords]);

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 45px)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-base)',
    }}>
      
      {/* 1. TOPBAR NAVIGATION */}
      <header style={{
        width: '100%',
        height: '56px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
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
          {/* Left: Brand + Domain Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '30px', height: '30px', position: 'relative' }}>
                <Image
                  src="/lsfd-logo.png"
                  alt="LSFD"
                  width={30}
                  height={30}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                LSFD <span style={{ color: 'var(--color-brand-blue)' }}>Medilog</span>
              </span>
            </Link>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="topbar-nav-links">
              <Link href="/search?category=protocol" className="top-nav-link">Protocoles</Link>
              <Link href="/search?category=medication" className="top-nav-link">Pharmacologie</Link>
              <Link href="/search?category=maneuver" className="top-nav-link">Manœuvres</Link>
              <Link href="/search?category=equipment" className="top-nav-link">Matériel</Link>
              {allPacks.length > 0 && (
                <Link href={`/packs/${allPacks[0].slug}`} className="top-nav-link">Packs d'urgence</Link>
              )}
            </nav>
          </div>

          {/* Right: Theme Toggle + Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mode White & Black Switcher Toggle */}
            <ThemeToggle />

            <Link
              href="/admin"
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                fontWeight: 500,
                transition: 'all 120ms ease',
              }}
              className="topbar-admin-btn"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* 2. CENTRAL DISPATCH PORTAL (Format Google / Hub Central Image 1) */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px 60px',
        maxWidth: '860px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Central LSFD Emblem */}
        <div style={{
          width: '76px',
          height: '76px',
          position: 'relative',
          marginBottom: '14px',
        }}>
          <Image
            src="/lsfd-logo.png"
            alt="LSFD EMS"
            width={76}
            height={76}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Main Title */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: 'var(--color-text-primary)',
          margin: '0 0 6px',
          lineHeight: 1.2,
        }}>
          LSFD <span style={{ color: 'var(--color-brand-blue)' }}>Medilog</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '13.5px',
          color: 'var(--color-text-secondary)',
          margin: '0 0 28px',
          maxWidth: '540px',
        }}>
          Moteur de recherche des protocoles d'urgence et pharmacopée EMS
        </p>

        {/* Central Search Box */}
        <div ref={containerRef} style={{ width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '18px' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              border: isFocused ? '1px solid var(--color-brand-blue)' : '1px solid var(--color-border)',
              borderRadius: isOpen && results.length > 0 ? '24px 24px 0 0' : '24px',
              padding: '11px 18px',
              boxShadow: 'var(--card-shadow)',
              transition: 'all 120ms ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isFocused ? 'var(--color-brand-blue)' : 'var(--color-text-muted)'}
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
                fontSize: '14.5px',
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

            <kbd style={{
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
              userSelect: 'none',
            }}>
              Entrée ↵
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
                border: '1px solid var(--color-brand-blue)',
                borderTop: 'none',
                borderRadius: '0 0 20px 20px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
                zIndex: 50,
                maxHeight: '340px',
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
                      borderLeft: isSelected ? '3px solid var(--color-brand-blue)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span className="badge badge-category" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {CATEGORY_MAP[result.record.category] || result.record.category}
                      </span>
                      <span style={{
                        fontSize: '13.5px',
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
                      <span className={`badge badge-${result.record.severity}`} style={{ fontSize: '10px', padding: '1px 6px', flexShrink: 0 }}>
                        {SEVERITY_MAP[result.record.severity] || result.record.severity}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons (Recherche Medilog | Protocole Arrêt Cardiaque (ACLS) | Fiche au hasard) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}>
          <button
            type="button"
            onClick={() => {
              if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
              else inputRef.current?.focus();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            className="action-portal-btn"
          >
            Recherche Medilog
          </button>

          {criticalCardio && (
            <Link
              href={`/records/${criticalCardio.slug}`}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: 'var(--color-brand-red)',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 120ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              className="critical-portal-btn"
            >
              <span>Protocole Arrêt Cardiaque (ACLS)</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleRandomRecord}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            className="action-portal-btn"
          >
            Fiche au hasard
          </button>
        </div>

        {/* Accès rapide aux référentiels */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Accès rapide aux référentiels :
          </div>

          {/* Row 1: Main Category Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {categoryPills.map(cat => (
              <Link
                key={cat.label}
                href={cat.href}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                }}
                className="shortcut-pill"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Row 2: Clinical Emergency Protocols */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', maxWidth: '720px' }}>
            {protocolPills.map(record => (
              <Link
                key={record.id}
                href={`/records/${record.slug}`}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '4px 11px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                }}
                className="shortcut-pill"
              >
                {record.title}
              </Link>
            ))}
          </div>
        </div>

      </main>

      <style>{`
        .top-nav-link {
          padding: 5px 10px;
          font-size: 12.5px;
          color: var(--color-text-secondary);
          text-decoration: none;
          border-radius: 5px;
          font-weight: 500;
          transition: all 120ms ease;
        }
        .top-nav-link:hover {
          color: var(--color-brand-blue);
          background-color: var(--color-bg-hover);
        }
        .topbar-admin-btn:hover {
          color: var(--color-brand-blue) !important;
          border-color: var(--color-brand-blue) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .action-portal-btn:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .critical-portal-btn:hover {
          border-color: var(--color-brand-red) !important;
          background-color: rgba(239, 68, 68, 0.08) !important;
        }
        .shortcut-pill:hover {
          border-color: var(--color-brand-blue) !important;
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
        @media (max-width: 768px) {
          .topbar-nav-links {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
