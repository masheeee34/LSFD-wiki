'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function highlightSnippet(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(239, 68, 68, 0.25)', color: 'var(--color-text-primary)', borderRadius: '2px', padding: '0 3px', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  protocol: 'Protocole',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvre',
  equipment: 'Matériel',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Urgence vitale',
  urgent: 'Urgent',
  routine: 'Routine',
};

export default function SearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      setResults([]);
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        router.push(`/records/${results[selectedIndex].record.slug}`);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [results, selectedIndex, onClose, router]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/records?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json() as SearchResult[];
        setResults(data);
        setSelectedIndex(0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 100);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        animation: 'fadeIn 0.12s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
          animation: 'slideUp 0.15s ease-out',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(16px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-subtle)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un protocole, une molécule, un geste..."
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
              onClick={() => setQuery('')}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-faint)',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '2px 6px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Effacer
            </button>
          )}
          <kbd style={{
            fontSize: '10.5px',
            fontFamily: 'var(--font-mono)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '2px 6px',
            color: 'var(--color-text-muted)',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {isLoading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
              Recherche dans le Medilog...
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '13.5px', fontWeight: 600 }}>
                Aucun résultat pour "{query}"
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '4px' }}>
                Vérifiez l'orthographe ou saisissez un mot-clé (ex: ACLS, Évaluation, Choc, IV).
              </p>
            </div>
          )}

          {!isLoading && results.map((result, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={result.record.id}
                onClick={() => {
                  router.push(`/records/${result.record.slug}`);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  background: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--color-brand-red)' : '3px solid transparent',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-category" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {CATEGORY_LABELS[result.record.category] || result.record.category}
                  </span>
                  {result.record.severity && (
                    <span className={`badge badge-${result.record.severity}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {SEVERITY_LABELS[result.record.severity] || result.record.severity}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                    /{result.record.slug}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                  {result.record.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                  {highlightSnippet(result.snippet, query)}
                </div>
              </div>
            );
          })}

          {!query && (
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '10px' }}>
                Accès direct par domaine
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Protocoles opérationnels', category: 'protocol', count: 'ACLS, ABCDE, Trauma' },
                  { label: 'Pharmacologie & dosages', category: 'medication', count: 'Adrénaline, Narcan, Amiodarone' },
                  { label: 'Manœuvres de secours', category: 'maneuver', count: 'RSI, Décompression, Voies aériennes' },
                  { label: 'Dotation matériel', category: 'equipment', count: 'LifePak 15, BVM, Moniteurs' },
                ].map(item => (
                  <div
                    key={item.category}
                    onClick={() => {
                      router.push(`/search?category=${item.category}`);
                      onClose();
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                    className="modal-cat-box"
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>↑↓ naviguer</span>
            <span>↵ ouvrir</span>
            <span>ESC fermer</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>LSFD Medilog</span>
        </div>
      </div>

      <style>{`
        .modal-cat-box:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
